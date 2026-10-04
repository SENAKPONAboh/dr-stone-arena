import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { MAX_LIVES } from '@/lib/lives';
import { getTodaySelection } from '@/lib/daily-cases';
import { caseDuration } from '@/lib/case-duration';
import { elapsedSinceStart } from '@/lib/challenge-token';

// Marge de réseau (secondes) tolérée au-delà du chrono avant de considérer la réponse comme hors délai
const LATE_GRACE = 12;

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const clinicalCaseId = typeof body?.clinicalCaseId === 'string' ? body.clinicalCaseId : '';
    const userAnswer = typeof body?.userAnswer === 'string' ? body.userAnswer.slice(0, 1000) : '';
    const clientTime = Number(body?.timeSpent);

    const clinicalCase = await prisma.clinicalCase.findUnique({
      where: { id: clinicalCaseId }
    });

    if (!clinicalCase) {
      return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });
    }

    // --- Contrôles serveur : cas de la sélection du jour ---
    const selection = await getTodaySelection(user.id);
    if (!selection || !selection.includes(clinicalCase.id)) {
      return NextResponse.json({ error: "Ce cas ne fait pas partie de ton défi du jour." }, { status: 403 });
    }

    // --- Temps : mesuré côté serveur grâce au jeton de début de cas ---
    const maxTime = caseDuration(clinicalCase.difficulty, clinicalCase.durationMax);
    const declared = Number.isFinite(clientTime) ? Math.max(0, Math.min(maxTime, Math.round(clientTime))) : maxTime;
    const elapsed = await elapsedSinceStart(body?.startToken, user.id, clinicalCase.id);
    // Sans jeton valide (ancien écran resté ouvert) : pas de bonus de rapidité.
    const timeSpent = elapsed === null ? maxTime : Math.min(maxTime, Math.max(declared, Math.floor(elapsed) - 3));
    const tooLate = elapsed !== null && elapsed > maxTime + LATE_GRACE;

    // On nettoie le texte : on enlève les espaces au début/à la fin et on met tout en minuscules
    const normalizeString = (str: string) => str.trim().toLowerCase();
    const isCorrect = !tooLate && normalizeString(userAnswer) === normalizeString(clinicalCase.correctAnswer);

    // Tout se passe dans UNE transaction verrouillée par joueur : deux envois simultanés (double clic, script)
    // sont traités l'un après l'autre, ce qui empêche le double gain d'XP et la perte d'une seule vie pour deux erreurs.
    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { xp: true, lives: true, streak: true, lastActive: true, lastLifeLostAt: true, chestAvailable: true, flameProtectedUntil: true },
      });
      if (!fresh) throw new Error('NO_USER');
      if (fresh.lives <= 0) throw new Error('NO_LIVES');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const alreadyPlayed = await tx.attempt.findFirst({
        where: { userId: user.id, clinicalCaseId: clinicalCase.id, createdAt: { gte: startOfDay } },
        select: { id: true },
      });
      if (alreadyPlayed) throw new Error('ALREADY');

      // --- Calcul de l'XP ---
      let xpEarned = 0;
      let streakBonus = 0;
      if (isCorrect) {
        xpEarned = clinicalCase.xp;
        if (timeSpent < maxTime / 2) {
          xpEarned += 5; // Bonus de vitesse
        }
      }

      await tx.attempt.create({
        data: {
          userId: user.id,
          clinicalCaseId: clinicalCase.id,
          userAnswer: tooLate ? 'Aucune réponse (Temps dépassé)' : userAnswer,
          isCorrect,
          timeSpent,
          xpEarned,
        }
      });

      // --- Gestion du Streak ---
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Protection Flamme (Gel/Assurance) : uniquement utilisée si une protection est active
      const protectionActive = fresh.flameProtectedUntil
        ? new Date(fresh.flameProtectedUntil) > new Date()
        : false;

      const lastActive = fresh.lastActive ? new Date(fresh.lastActive) : null;
      let newStreak = fresh.streak;
      let streakIncreased = false;
      let flameLost = false; // mémorisation de la perte (Restaure-Flamme, 48 h)

      if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
          streakIncreased = true;
        } else if (diffDays > 1) {
          if (protectionActive) {
            newStreak += 1;
            streakIncreased = true;
          } else {
            newStreak = 1;
            streakIncreased = true;
            flameLost = true;
          }
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
      let newLastLifeLostAt = fresh.lastLifeLostAt;
      if (!isCorrect && fresh.lives > 0) {
        if (fresh.lives >= MAX_LIVES || !fresh.lastLifeLostAt) {
          newLastLifeLostAt = new Date();
        }
      }
      const newLives = isCorrect ? fresh.lives : Math.max(0, fresh.lives - 1);

      // --- Gestion du Coffre : tous les 7 jours ---
      let chestUnlocked = false;
      if (streakIncreased && newStreak % 7 === 0) {
        chestUnlocked = true;
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: xpEarned },
          streak: newStreak,
          lastActive: new Date(),
          lives: newLives,
          lastLifeLostAt: newLastLifeLostAt,
          chestAvailable: chestUnlocked ? true : fresh.chestAvailable,
          ...(flameLost ? { streakBeforeReset: fresh.streak, flameLostAt: new Date() } : {}),
        },
      });

      // --- Vérification des Badges (requêtes groupées) ---
      const newBadges = [];
      const [allAttempts, allBadges, userBadges] = await Promise.all([
        tx.attempt.count({ where: { userId: user.id } }),
        tx.badge.findMany({ where: { name: { in: ["Premier Cas", "Série de 7 jours", "Série de 30 jours", "Centurion"] } } }),
        tx.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true } }),
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
        await tx.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
        newBadges.push(badge);
      }

      return { xpEarned, streakBonus, newLives, newBadges, chestUnlocked, xpBefore: fresh.xp };
    }, { timeout: 20000 });

    return NextResponse.json({
      isCorrect,
      xpEarned: result.xpEarned,
      streakBonus: result.streakBonus,
      livesLeft: result.newLives,
      newBadges: result.newBadges,
      chestUnlocked: result.chestUnlocked,
      timedOut: tooLate,
      // Pour l'animation « nouveau grade » côté écran
      xpBefore: result.xpBefore,
      xpAfter: result.xpBefore + result.xpEarned,
      // Révélés seulement APRÈS la réponse
      correctAnswer: clinicalCase.correctAnswer,
      explanation: clinicalCase.explanation,
    });

  } catch (error: any) {
    if (error?.message === 'ALREADY') return NextResponse.json({ error: "Tu as déjà joué ce cas aujourd'hui." }, { status: 409 });
    if (error?.message === 'NO_LIVES') return NextResponse.json({ error: "Tu n'as plus de vies." }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
