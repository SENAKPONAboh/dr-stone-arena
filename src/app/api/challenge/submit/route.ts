import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { MAX_LIVES } from '@/lib/lives';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { clinicalCaseId, userAnswer, timeSpent } = await request.json();

    const clinicalCase = await prisma.clinicalCase.findUnique({
      where: { id: clinicalCaseId }
    });

    if (!clinicalCase) {
      return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });
    }

    // On nettoie le texte : on enlève les espaces au début/à la fin et on met tout en minuscules
    const normalizeString = (str: string) => str.trim().toLowerCase();
    const isCorrect = normalizeString(userAnswer) === normalizeString(clinicalCase.correctAnswer);

    // --- Calcul de l'XP ---
    let xpEarned = 0;
    let streakBonus = 0;
    if (isCorrect) {
      xpEarned = clinicalCase.xp;
      if (timeSpent < clinicalCase.durationMax / 2) {
        xpEarned += 5; // Bonus de vitesse
      }
    }

    await prisma.attempt.create({
      data: {
        userId: user.id,
        clinicalCaseId: clinicalCase.id,
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        xpEarned: xpEarned,
      }
    });

    // --- Gestion du Streak ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = user.lastActive ? new Date(user.lastActive) : null;
    let newStreak = user.streak;
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

    // Bonus de série : +5 XP si la série a augmenté aujourd'hui
    if (streakIncreased) {
      streakBonus = 5;
      xpEarned += streakBonus;
    }

    // --- Gestion des vies et de l'heure de perte ---
    let newLastLifeLostAt = user.lastLifeLostAt;
    if (!isCorrect && user.lives > 0) {
      if (user.lives >= MAX_LIVES || !user.lastLifeLostAt) {
        newLastLifeLostAt = new Date();
      }
    }
    const newLives = isCorrect ? user.lives : Math.max(0, user.lives - 1);

    // --- Gestion du Coffre : tous les 7 jours ---
    let chestUnlocked = false;
    if (streakIncreased && newStreak % 7 === 0) {
      chestUnlocked = true;
    }

    // --- Mise à jour globale de l'utilisateur ---
    await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: xpEarned },
        streak: newStreak,
        lastActive: new Date(),
        lives: newLives,
        lastLifeLostAt: newLastLifeLostAt,
        chestAvailable: chestUnlocked ? true : user.chestAvailable,
      }
    });

    // --- Vérification des Badges (optimisé : requêtes groupées, règles identiques) ---
    const newBadges = [];

    const [allAttempts, allBadges, userBadges] = await Promise.all([
      prisma.attempt.count({ where: { userId: user.id } }),
      prisma.badge.findMany({ where: { name: { in: ["Premier Cas", "Série de 7 jours", "Série de 30 jours", "Centurion"] } } }),
      prisma.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true } }),
    ]);
    const ownedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

    const rules = [
      { name: "Premier Cas", condition: allAttempts === 1 },
      { name: "Série de 7 jours", condition: newStreak >= 7 },
      { name: "Série de 30 jours", condition: newStreak >= 30 },
      { name: "Centurion", condition: allAttempts >= 100 },
    ];

    for (const rule of rules) {
      if (!rule.condition) continue;
      const badge = allBadges.find(b => b.name === rule.name);
      if (!badge || ownedBadgeIds.has(badge.id)) continue;
      await prisma.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
      newBadges.push(badge);
    }

    return NextResponse.json({ isCorrect, xpEarned, streakBonus, livesLeft: newLives, newBadges, chestUnlocked });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}