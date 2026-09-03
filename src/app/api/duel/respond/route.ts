import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PLAY_DEADLINE_HOURS, getDailyDuelQuota } from '@/lib/duel';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { duelId, accept } = await request.json();
    if (!duelId) return NextResponse.json({ error: "Duel manquant" }, { status: 400 });

    const duel = await prisma.duel.findUnique({ where: { id: duelId } });
    if (!duel) return NextResponse.json({ error: "Duel introuvable" }, { status: 404 });

    if (duel.opponentId !== user.id) {
      return NextResponse.json({ error: "Ce duel ne t'est pas destiné." }, { status: 403 });
    }
    if (duel.status !== 'EN_ATTENTE') {
      return NextResponse.json({ error: "Ce duel n'est plus en attente." }, { status: 400 });
    }
    if (duel.expiresAt < new Date()) {
      await prisma.duel.update({ where: { id: duel.id }, data: { status: 'EXPIRE' } });
      return NextResponse.json({ error: "Cette invitation a expiré." }, { status: 400 });
    }

    if (accept) {
      // Quota du RÉPONDANT aussi (règle validée : les deux consomment)
      const quota = getDailyDuelQuota(user.premiumTier);
      if (quota === 0) return NextResponse.json({ error: "Les duels sont réservés aux membres Premium." }, { status: 403 });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const duelsToday = await prisma.duel.count({
        where: {
          OR: [{ requesterId: user.id }, { opponentId: user.id }],
          status: { in: ['ACCEPTE', 'TERMINE'] },
          acceptedAt: { gte: todayStart }
        }
      });
      if (duelsToday >= quota) {
        return NextResponse.json({ error: `Tu as atteint ta limite de ${quota} duels aujourd'hui.` }, { status: 429 });
      }

      const playDeadline = new Date(Date.now() + PLAY_DEADLINE_HOURS * 60 * 60 * 1000);
      await prisma.duel.update({
        where: { id: duel.id },
        data: { status: 'ACCEPTE', acceptedAt: new Date(), playDeadline }
      });

      await prisma.notification.create({
        data: {
          userId: duel.requesterId,
          message: `${user.pseudo || `${user.prenom} ${user.nom}`} a accepté ton duel ! ⚔️`,
          icon: '⚔️'
        }
      });

      return NextResponse.json({ success: true, status: 'ACCEPTE' });
    } else {
      // Refus : aucun impact, ne compte pas au quota
      await prisma.duel.update({ where: { id: duel.id }, data: { status: 'REFUSE' } });
      return NextResponse.json({ success: true, status: 'REFUSE' });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}