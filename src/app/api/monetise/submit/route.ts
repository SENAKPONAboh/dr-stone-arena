import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { UA_PER_CASE } from '@/lib/monetise';
import { isWeekdayWAT } from '@/lib/wat-time';

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
  // Les 10 cas Élite du quotidien se jouent du lundi au vendredi. Le week-end, c'est le Rush.
  if (!isWeekdayWAT()) {
    return NextResponse.json({ error: "Les cas Élite du quotidien sont disponibles du lundi au vendredi. Ce week-end, place au Rush !" }, { status: 403 });
  }

  try {
    const { clinicalCaseId, userAnswer, timeSpent } = await request.json();

    const clinicalCase = await prisma.clinicalCase.findUnique({ where: { id: clinicalCaseId } });
    if (!clinicalCase) return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });

    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const response = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const selection = await tx.monetiseSelection.findFirst({
        where: { userId: user.id, date: { gte: today, lt: tomorrow } },
      });
      if (!selection) throw new Error('NO_SELECTION');
      if (!selection.caseIds.includes(clinicalCaseId)) throw new Error('NOT_IN_SELECTION');

      const alreadyPlayed = await tx.monetiseAttempt.findFirst({
        where: { userId: user.id, clinicalCaseId: clinicalCaseId, createdAt: { gte: today } },
      });
      if (alreadyPlayed) throw new Error('ALREADY_PLAYED');

      const isCorrect = normalizeString(userAnswer) === normalizeString(clinicalCase.correctAnswer);

      await tx.monetiseAttempt.create({
        data: {
          userId: user.id,
          clinicalCaseId: clinicalCase.id,
          userAnswer: userAnswer,
          isCorrect: isCorrect,
          timeSpent: timeSpent,
        },
      });

      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { uaBalance: true, streak: true, lastActive: true, chestAvailable: true, flameProtectedUntil: true },
      });
      if (!fresh) throw new Error('NO_USER');

      // === UA : +UA_PER_CASE par bonne réponse — AUCUN XP ===
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

      // === Flamme PARTAGÉE — même logique que le classique + protection (Gel/Assurance) ===
      const protectionActive = fresh.flameProtectedUntil ? new Date(fresh.flameProtectedUntil) > new Date() : false;
      const lastActive = fresh.lastActive ? new Date(fresh.lastActive) : null;
      let newStreak = fresh.streak;
      let streakIncreased = false;
      let flameLost = false;

      if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
          streakIncreased = true;
        } else if (diffDays > 1) {
          if (protectionActive) {
            // Flamme protégée : l'absence est sautée, la série continue
            newStreak += 1;
            streakIncreased = true;
          } else {
            newStreak = 1;
            streakIncreased = true;
            flameLost = true; // mémorisée pour le Restaure-Flamme (fenêtre 48 h)
          }
        }
      } else {
        newStreak = 1;
        streakIncreased = true;
      }

      const chestUnlocked = streakIncreased && newStreak % 7 === 0;

      await tx.user.update({
        where: { id: user.id },
        data: {
          streak: newStreak,
          lastActive: new Date(),
          chestAvailable: chestUnlocked ? true : fresh.chestAvailable,
          // Perte de Flamme → valeur exacte + horodatage sauvegardés
          ...(flameLost ? { streakBeforeReset: fresh.streak, flameLostAt: new Date() } : {}),
        },
      });

      // === Badges de série (comme en classique) ===
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
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}