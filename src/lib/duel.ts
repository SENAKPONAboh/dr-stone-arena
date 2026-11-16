// ===== SYSTÈME DE DUELS — Dr. Stone Arena =====
// Anti-pay-to-win : le Premium donne accès et quota, JAMAIS de points,
// de score ou d'avantage de correction.

import { PREMIUM_PLANS } from '@/lib/premium';

export const POINTS_PER_WIN = 10;
export const CASES_PER_DUEL = 5;
export const INVITE_EXPIRY_HOURS = 24;
export const PLAY_DEADLINE_HOURS = 24;

// Duel entre deux années différentes : chaque joueur reçoit les cas de SON année, de même difficulté, rangés
// à la suite dans Duel.caseIds (5 cas du demandeur puis 5 cas de l'adversaire). Même année : 5 cas communs.
export function duelCasesFor(duel: { caseIds: string[]; requesterId: string }, userId: string): string[] {
  if (duel.caseIds.length >= CASES_PER_DUEL * 2) {
    return userId === duel.requesterId ? duel.caseIds.slice(0, CASES_PER_DUEL) : duel.caseIds.slice(CASES_PER_DUEL, CASES_PER_DUEL * 2);
  }
  return duel.caseIds;
}

// Seuils Points Arena → XP (réclamables UNE seule fois chacun)
export const ARENA_THRESHOLDS = [
  { threshold: 100, xp: 50 },
  { threshold: 300, xp: 100 },
  { threshold: 600, xp: 200 },
  { threshold: 1000, xp: 300 },
] as const;

// Grades de duel — basés UNIQUEMENT sur les victoires (mérite pur)
export type DuelGradeEntry = { minWins: number; name: string; icon: string };

export const DUEL_GRADES: DuelGradeEntry[] = [
  { minWins: 0, name: 'Combattant', icon: '🥉' },
  { minWins: 10, name: 'Guerrier', icon: '⚔️' },
  { minWins: 25, name: 'Vétéran', icon: '🏹' },
  { minWins: 50, name: 'Expert', icon: '🔥' },
  { minWins: 100, name: 'Épique', icon: '💎' },
  { minWins: 200, name: 'Légendaire', icon: '👑' },
];

// Quota quotidien selon le tier Premium (0 = pas accès aux duels)
export function getDailyDuelQuota(premiumTier: number | null): number {
  const plan = PREMIUM_PLANS.find(p => p.tier === premiumTier);
  return plan ? plan.dailyDuels : 0;
}

export function getDuelGrade(wins: number): { current: DuelGradeEntry; next: DuelGradeEntry | null } {
  let current: DuelGradeEntry = DUEL_GRADES[0];
  for (const g of DUEL_GRADES) {
    if (wins >= g.minWins) current = g;
  }
  const next = DUEL_GRADES.find(g => g.minWins > wins) ?? null;
  return { current, next };
}