import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { UA_PER_CASE } from '@/lib/monetise';

const normalizeString = (str: string) => str.trim().toLowerCase();

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { clinicalCaseId, userAnswer, timeSpent } = await request.json();

    // Le cas est une donnée fixe : lecture hors zone critique
    const clinicalCase = await prisma.clinicalCase.findUnique({ where: { id: clinicalCaseId } });
    if (!clinicalCase) return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });

    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const response = await prisma.$transaction(async (tx) => {
      // 🔒 VERROU PAR JOUEUR (même verrou que le Rush) : une soumission à la fois, aucun double crédit
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

      // === 1. Vérifications serveur — aucune confiance au client ===
      // a) Sélection du jour (figée par la page) : le cas soumis doit en faire partie
      const selection = await tx.monetiseSelection.findFirst({
        where: { userId: user.id, date: { gte: today, lt: tomorrow } },
      });
      if (!selection) throw new Error('NO_SELECTION');
      if (!selection.caseIds.includes(clinicalCaseId)) throw new Error('NOT_IN_SELECTION');

      // b) Anti-rejoue : ce cas ne doit pas avoir été tenté aujourd'hui
      //    (avec le a), le plafond journalier 10 cas × 1 000 UA est garanti structurellement)
      const alreadyPlayed = await tx.monetiseAttempt.findFirst({
        where: { userId: user.id, clinicalCaseId: clinicalCaseId, createdAt: { gte: today } },
      });
      if (alreadyPlayed) throw new Error('ALREADY_PLAYED');

      // === 2. Correction serveur ===
      const isCorrect = normalizeString(userAnswer) === normalizeString(clinicalCase.correctAnswer);

      // === 3. Tentative enregistrée ===
      await tx.monetiseAttempt.create({
        data: {
          userId: user.id,
          clinicalCaseId: clinicalCase.id,
          userAnswer: userAnswer,
          isCorrect: isCorrect,
          timeSpent: timeSpent,
        },
      });

      // Relecture fraîche du compte (solde + Flamme)
      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { uaBalance: true, streak: true, lastActive: true, chestAvailable: true },
      });
      if (!fresh) throw new Error('NO_USER');

      // === 4. UA : +1 000 UA par bonne réponse — AUCUN XP (décision actée) ===
      let uaEarned = 0;
      let balanceAfter = fresh.uaBalance;
      if (isCorrect) {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { uaBalance: { increment: UA_PER_CASE } },
          select: { uaBalance: true },
        });
        balanceAfter = updated.uaBalance;
        uaEarned = UA_PER_CASE;
        await tx.uaTransaction.create({
          data: {
            userId: user.id,
            type: 'CAS_REUSSI',
            amount: UA_PER_CASE,
            balanceBefore: fresh.uaBalance,
            balanceAfter: updated.uaBalance,
            reference: clinicalCase.id,
          },
        });
      }

      // === 5. Flamme PARTAGÉE — même logique que le mode classique (api/challenge/submit) ===
      // Compteur + coffre des 7 jours + badges de série. Pas d'XP, pas de vies.
      const lastActive = fresh.lastActive ? new Date(fresh.lastActive) : null;
      let newStreak = fresh.streak;
      let streakIncreased = false;

      if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
          streakIncreased = true;
        } else if (diffDays > 1) {
          newStreak = 1;
          streakIncreased = true;
        }
      } else {
        newStreak = 1;
        streakIncreased = true;
      }

      // Coffre : tous les 7 jours de série
      const chestUnlocked = streakIncreased && newStreak % 7 === 0;

      await tx.user.update({
        where: { id: user.id },
        data: {
          streak: newStreak,
          lastActive: new Date(),
          chestAvailable: chestUnlocked ? true : fresh.chestAvailable,
        },
      });

      // === 6. Badges de série (comme en classique) ===
      const newBadges: { name: string; icon: string }[] = [];
      const seriesBadges = await tx.badge.findMany({
        where: { name: { in: ["Série de 7 jours", "Série de 30 jours"] } },
      });
      const owned = await tx.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true } });
      const ownedIds = new Set(owned.map(ub => ub.badgeId));

      for (const b of seriesBadges) {
        const condition =
          (b.name === "Série de 7 jours" && newStreak >= 7) ||
          (b.name === "Série de 30 jours" && newStreak >= 30);
        if (condition && !ownedIds.has(b.id)) {
          await tx.userBadge.create({ data: { userId: user.id, badgeId: b.id } });
          newBadges.push({ name: b.name, icon: b.icon });
        }
      }

      // === 7. Réponse — correctAnswer/explication retournés SEULEMENT après soumission ===
      return {
        isCorrect: isCorrect,
        correctAnswer: clinicalCase.correctAnswer,
        explanation: clinicalCase.explanation,
        uaEarned: uaEarned,
        balanceAfter: balanceAfter,
        streak: newStreak,
        chestUnlocked: chestUnlocked,
        newBadges: newBadges,
      };
    });

    return NextResponse.json(response);
  } catch (e: any) {
    if (e?.message === 'NO_SELECTION') return NextResponse.json({ error: "Aucune sélection du jour. Ouvre d'abord la page du jour." }, { status: 400 });
    if (e?.message === 'NOT_IN_SELECTION') return NextResponse.json({ error: "Ce cas ne fait pas partie de ta sélection du jour." }, { status: 400 });
    if (e?.message === 'ALREADY_PLAYED') return NextResponse.json({ error: "Ce cas a déjà été joué aujourd'hui." }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}