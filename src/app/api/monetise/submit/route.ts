import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { UA_PER_CASE, UA_DAILY_CAP } from '@/lib/monetise';

const normalizeString = (str: string) => str.trim().toLowerCase();

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // 🔒 Pass obligatoire
  if (!user.passActive) {
    return NextResponse.json({ error: "Pass Arène Monétisé requis." }, { status: 403 });
  }

  try {
    const { clinicalCaseId, userAnswer, timeSpent } = await request.json();

    // 1. Le cas doit appartenir à la sélection du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const selection = await prisma.monetiseSelection.findFirst({
      where: { userId: user.id, date: { gte: today, lt: tomorrow } },
    });
    if (!selection || !selection.caseIds.includes(clinicalCaseId)) {
      return NextResponse.json({ error: "Ce cas ne fait pas partie de tes 10 cas du jour." }, { status: 400 });
    }

    // 2. Pas de double tentative du même cas le même jour
    const alreadyTried = await prisma.monetiseAttempt.findFirst({
      where: { userId: user.id, clinicalCaseId, createdAt: { gte: today } },
    });
    if (alreadyTried) {
      return NextResponse.json({ error: "Tu as déjà tenté ce cas aujourd'hui." }, { status: 400 });
    }

    // 3. Correction
    const clinicalCase = await prisma.clinicalCase.findUnique({ where: { id: clinicalCaseId } });
    if (!clinicalCase) return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });

    const isCorrect = normalizeString(userAnswer) === normalizeString(clinicalCase.correctAnswer);

    // 4. Enregistrement de la tentative monétisée
    await prisma.monetiseAttempt.create({
      data: { userId: user.id, clinicalCaseId, userAnswer, isCorrect, timeSpent },
    });

    // 5. Crédit UA (transaction atomique + grand livre)
    let uaEarned = 0;
    let balanceAfter = user.uaBalance;
    if (isCorrect) {
      // Ceinture de sécurité : plafond journalier
      const creditedToday = await prisma.uaTransaction.aggregate({
        where: { userId: user.id, type: 'CAS_REUSSI', createdAt: { gte: today } },
        _sum: { amount: true },
      });
      const credited = creditedToday._sum.amount ?? 0;
      if (credited + UA_PER_CASE <= UA_DAILY_CAP) {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.user.update({
            where: { id: user.id },
            data: { uaBalance: { increment: UA_PER_CASE } },
            select: { uaBalance: true },
          });
          balanceAfter = updated.uaBalance;
          await tx.uaTransaction.create({
            data: {
              userId: user.id,
              type: 'CAS_REUSSI',
              amount: UA_PER_CASE,
              balanceBefore: updated.uaBalance - UA_PER_CASE,
              balanceAfter: updated.uaBalance,
              reference: clinicalCaseId,
            },
          });
        });
        uaEarned = UA_PER_CASE;
      }
    }

    // 6. Flamme partagée (streak) — même logique que le classique, sans vies, sans coffre, sans badges
    const lastActive = user.lastActive ? new Date(user.lastActive) : null;
    let newStreak = user.streak;
    let streakBeforeReset = user.streakBeforeReset;
    let streakIncreased = false;

    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - lastActive.getTime()) / 86400000);
      if (diffDays === 1) { newStreak += 1; streakIncreased = true; }
      else if (diffDays > 1) {
        streakBeforeReset = user.streak; // valeur d'avant la rupture (pour Restaure-Flamme)
        newStreak = 1;
        streakIncreased = true;
      }
      // diffDays === 0 : déjà joué aujourd'hui (classique ou monétisé) → streak inchangé
    } else {
      streakBeforeReset = user.streak;
      newStreak = 1;
      streakIncreased = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        streak: newStreak,
        streakBeforeReset,
        lastActive: new Date(),
      },
    });

    return NextResponse.json({
      isCorrect,
      uaEarned,
      balanceAfter,
      streak: newStreak,
      explanation: clinicalCase.explanation,
      correctAnswer: clinicalCase.correctAnswer,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}