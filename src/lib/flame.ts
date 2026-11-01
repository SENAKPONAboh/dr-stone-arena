// ===== FLAMME (série de jours) — une seule règle pour tout le jeu =====
// Les jours se comptent à l'heure du Niger / Bénin (UTC+1), pas à l'heure du serveur Vercel (UTC).
// Règle : un jour sans aucun cas joué = Flamme éteinte, sauf si une protection (Gel / Assurance)
// couvre les jours manqués. La perte est mémorisée (streakBeforeReset + flameLostAt) pour le Restaure-Flamme.
import prisma from '@/lib/prisma';

const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Numéro du jour à l'heure locale (change à minuit à Niamey). */
export function watDayIndex(date: Date | string | number = new Date()): number {
  return Math.floor((new Date(date).getTime() + WAT_OFFSET_MS) / DAY_MS);
}

/** Minuit (heure de Niamey) du jour donné. */
export function startOfWatDay(date: Date = new Date()): Date {
  return new Date(watDayIndex(date) * DAY_MS - WAT_OFFSET_MS);
}

type FlameState = { streak: number; lastActive: Date | string | null; flameProtectedUntil?: Date | string | null };

/** Les jours manqués (jusqu'à hier soir) sont couverts si la protection dure au moins jusqu'à minuit aujourd'hui. */
function protectionCovers(until: Date | string | null | undefined, now: Date) {
  return !!until && new Date(until).getTime() > startOfWatDay(now).getTime();
}

/**
 * - `played`    : déjà joué aujourd'hui
 * - `atRisk`    : joué hier, pas encore aujourd'hui (s'éteint à minuit)
 * - `protected` : jours manqués couverts par une protection
 * - `lost`      : au moins un jour manqué sans protection
 * - `none`      : pas de Flamme
 */
export function flameStatus(u: FlameState, now = new Date()): 'played' | 'atRisk' | 'protected' | 'lost' | 'none' {
  if (u.streak <= 0 || !u.lastActive) return 'none';
  const gap = watDayIndex(now) - watDayIndex(u.lastActive);
  if (gap <= 0) return 'played';
  if (gap === 1) return 'atRisk';
  return protectionCovers(u.flameProtectedUntil, now) ? 'protected' : 'lost';
}

/** Flamme à afficher : 0 si elle s'est éteinte, même si la base n'est pas encore à jour. */
export function effectiveStreak(u: FlameState, now = new Date()): number {
  return flameStatus(u, now) === 'lost' ? 0 : Math.max(0, u.streak);
}

/** Nouvelle Flamme après un cas joué (classique ou Élite). */
export function streakAfterPlay(u: FlameState, now = new Date()) {
  if (!u.lastActive || u.streak <= 0) {
    return { newStreak: 1, increased: true, flameLost: false };
  }
  const gap = watDayIndex(now) - watDayIndex(u.lastActive);
  if (gap <= 0) return { newStreak: u.streak, increased: false, flameLost: false };
  if (gap === 1 || protectionCovers(u.flameProtectedUntil, now)) {
    return { newStreak: u.streak + 1, increased: true, flameLost: false };
  }
  return { newStreak: 1, increased: true, flameLost: true };
}

/**
 * Éteint en base une Flamme perdue (à l'ouverture de l'appli et par la tâche du soir).
 * Écriture conditionnelle : ne fait rien si l'étudiant vient de jouer entre-temps.
 */
export async function persistLostFlame(user: { id: string } & FlameState): Promise<boolean> {
  if (flameStatus(user) !== 'lost' || !user.lastActive) return false;
  const res = await prisma.user.updateMany({
    where: { id: user.id, streak: user.streak, lastActive: new Date(user.lastActive) },
    data: { streak: 0, streakBeforeReset: user.streak, flameLostAt: new Date() },
  });
  return res.count > 0;
}
