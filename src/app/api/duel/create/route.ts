import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CASES_PER_DUEL, INVITE_EXPIRY_HOURS, getDailyDuelQuota } from '@/lib/duel';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { opponentId } = await request.json();
    if (!opponentId) return NextResponse.json({ error: "Adversaire manquant" }, { status: 400 });
    if (opponentId === user.id) return NextResponse.json({ error: "Tu ne peux pas te défier toi-même." }, { status: 400 });

    // 1. Premium obligatoire (demandeur)
    const quota = getDailyDuelQuota(user.premiumTier);
    if (quota === 0) return NextResponse.json({ error: "Les duels sont réservés aux membres Premium." }, { status: 403 });

    // 2. Adversaire
    const opponent = await prisma.user.findUnique({
      where: { id: opponentId },
      select: { id: true, prenom: true, nom: true, role: true, anneeEtude: true, isPremium: true, premiumTier: true }
    });
    if (!opponent || opponent.role !== 'ETUDIANT') {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // 3. Adversaire Premium obligatoire (règle validée)
    if (!opponent.isPremium || !opponent.premiumTier) {
      return NextResponse.json({ error: "Cet étudiant n'a pas accès aux duels (Premium uniquement)." }, { status: 400 });
    }

    // 4. Même niveau obligatoire
    if (!user.anneeEtude || opponent.anneeEtude !== user.anneeEtude) {
      return NextResponse.json({ error: "Tu ne peux défier que des étudiants de ton niveau." }, { status: 400 });
    }

    // 5. Quota du demandeur (duels ACCEPTÉS aujourd'hui uniquement)
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

    // 6. Pas de duel déjà actif entre les deux
    const activeDuel = await prisma.duel.findFirst({
      where: {
        OR: [
          { requesterId: user.id, opponentId },
          { requesterId: opponentId, opponentId: user.id }
        ],
        status: { in: ['EN_ATTENTE', 'ACCEPTE'] }
      }
    });
    if (activeDuel) return NextResponse.json({ error: "Un duel est déjà en cours avec cet étudiant." }, { status: 400 });

    // 7. Banque de cas du niveau commun (cas déjà publiés = toute la banque)
    const eligibleCases = await prisma.clinicalCase.findMany({
      where: { anneeEtude: user.anneeEtude },
      select: { id: true }
    });
    if (eligibleCases.length < CASES_PER_DUEL) {
      return NextResponse.json({ error: `Pas encore assez de cas publiés pour ton niveau (${eligibleCases.length}/${CASES_PER_DUEL}). Reviens bientôt !` }, { status: 400 });
    }

    // 8. Tirage aléatoire de 5 cas (Fisher-Yates) — identiques pour les deux joueurs
    const shuffled = [...eligibleCases];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const caseIds = shuffled.slice(0, CASES_PER_DUEL).map(c => c.id);

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const duel = await prisma.duel.create({
      data: { requesterId: user.id, opponentId, anneeEtude: user.anneeEtude, caseIds, status: 'EN_ATTENTE', expiresAt }
    });

    // Notification (cloche) — la bannière géante s'affiche via le dashboard
    await prisma.notification.create({
      data: {
        userId: opponentId,
        message: `${user.pseudo || `${user.prenom} ${user.nom}`} te défie en duel ! ⚔️`,
        icon: '⚔️'
      }
    });

    return NextResponse.json({ success: true, duelId: duel.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}