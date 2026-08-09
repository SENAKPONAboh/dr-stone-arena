import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
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
      // S'il perd une vie, on enregistre l'heure (si ce n'est pas déjà fait récemment)
      // On met à jour l'heure seulement s'il était à plein de vies ou s'il n'avait pas de timer
      if (user.lives === 5 || !user.lastLifeLostAt) {
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
        lastLifeLostAt: newLastLifeLostAt, // <-- AJOUT
        chestAvailable: chestUnlocked ? true : user.chestAvailable,
      }
    });

    // --- Vérification des Badges ---
    const newBadges = [];
    const allAttempts = await prisma.attempt.count({ where: { userId: user.id } });

    if (allAttempts === 1) {
      const badge = await prisma.badge.findFirst({ where: { name: "Premier Cas" } });
      if (badge) {
        await prisma.userBadge.upsert({ where: { userId_badgeId: { userId: user.id, badgeId: badge.id } }, update: {}, create: { userId: user.id, badgeId: badge.id } });
        newBadges.push(badge);
      }
    }

    if (newStreak >= 7) {
      const badge = await prisma.badge.findFirst({ where: { name: "Série de 7 jours" } });
      if (badge) {
        const hasBadge = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId: user.id, badgeId: badge.id } } });
        if (!hasBadge) {
          await prisma.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
          newBadges.push(badge);
        }
      }
    }

    if (newStreak >= 30) {
      const badge = await prisma.badge.findFirst({ where: { name: "Série de 30 jours" } });
      if (badge) {
        const hasBadge = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId: user.id, badgeId: badge.id } } });
        if (!hasBadge) {
          await prisma.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
          newBadges.push(badge);
        }
      }
    }

    if (allAttempts >= 100) {
      const badge = await prisma.badge.findFirst({ where: { name: "Centurion" } });
      if (badge) {
        const hasBadge = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId: user.id, badgeId: badge.id } } });
        if (!hasBadge) {
          await prisma.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
          newBadges.push(badge);
        }
      }
    }

    return NextResponse.json({ isCorrect, xpEarned, streakBonus, livesLeft: newLives, newBadges, chestUnlocked });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}