import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/push';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { PLAY_DEADLINE_HOURS } from '@/lib/duel';
import { getEffectiveDuelQuota } from '@/lib/decouverte';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
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
      const quota = getEffectiveDuelQuota(user); // Premium ou Découverte 7 jours
      if (quota === 0) return NextResponse.json({ error: "Les duels sont réservés aux membres Premium." }, { status: 403 });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const playDeadline = new Date(Date.now() + PLAY_DEADLINE_HOURS * 60 * 60 * 1000);

      // Verrou par étudiant : accepter plusieurs duels au même instant ne permet plus de dépasser le quota du jour,
      // et un même duel ne peut être accepté qu'une fois (updateMany sur le statut EN_ATTENTE).
      const outcome = await prisma.$transaction(async (tx) => {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'duel-accept' + user.id}))`;
        } catch (lockErr) {
          console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
        }
        const duelsToday = await tx.duel.count({
          where: {
            OR: [{ requesterId: user.id }, { opponentId: user.id }],
            status: { in: ['ACCEPTE', 'TERMINE'] },
            acceptedAt: { gte: todayStart }
          }
        });
        if (duelsToday >= quota) return 'QUOTA' as const;
        const changed = await tx.duel.updateMany({
          where: { id: duel.id, status: 'EN_ATTENTE' },
          data: { status: 'ACCEPTE', acceptedAt: new Date(), playDeadline }
        });
        return changed.count === 0 ? 'GONE' as const : 'OK' as const;
      });
      if (outcome === 'QUOTA') {
        return NextResponse.json({ error: `Tu as atteint ta limite de ${quota} duels aujourd'hui.` }, { status: 429 });
      }
      if (outcome === 'GONE') {
        return NextResponse.json({ error: "Ce duel n'est plus en attente." }, { status: 400 });
      }

      await prisma.notification.create({
        data: {
          userId: duel.requesterId,
          message: `${user.pseudo || `${user.prenom} ${user.nom}`} a accepté ton duel ! ⚔️`,
          icon: '⚔️'
        }
      });

      await sendPushToUser(duel.requesterId, {
        title: '⚔️ Duel accepté !',
        body: `${user.pseudo || `${user.prenom} ${user.nom}`} a accepté ton duel. À toi de jouer !`,
        url: `/etudiant/duel/${duel.id}`,
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