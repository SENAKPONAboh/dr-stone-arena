// ===== SAISONS MENSUELLES — Dr. Stone Arena =====
// À la clôture du mois (panel admin), on enregistre le grade final de chaque étudiant puis les XP repartent à zéro.
// Les lectures sont « tolérantes » : si la table n'existe pas encore (SQL non exécuté), l'application continue de fonctionner.

import prisma from '@/lib/prisma';
import { XP_GRADES, getGradeByIndex } from '@/lib/grades';

export type SeasonRow = { season: string; xp: number; gradeIndex: number; rank: number };

export type SeasonSummary = {
  seasons: SeasonRow[];                 // du plus récent au plus ancien
  gradeCounts: Record<number, number>;  // combien de fois chaque grade a été atteint en fin de saison
  total: number;
};

const EMPTY: SeasonSummary = { seasons: [], gradeCounts: {}, total: 0 };

export async function getSeasonSummary(userId: string): Promise<SeasonSummary> {
  try {
    const rows = await prisma.seasonResult.findMany({
      where: { userId },
      orderBy: { season: 'desc' },
      select: { season: true, xp: true, gradeIndex: true, rank: true },
    });
    const gradeCounts: Record<number, number> = {};
    for (const r of rows) gradeCounts[r.gradeIndex] = (gradeCounts[r.gradeIndex] ?? 0) + 1;
    return { seasons: rows, gradeCounts, total: rows.length };
  } catch {
    return EMPTY;
  }
}

/** « 2026-10 » → « octobre 2026 » */
export function seasonLabel(season: string): string {
  const [y, m] = season.split('-').map(Number);
  if (!y || !m) return season;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Mois proposé par défaut à la clôture : en début de mois on clôture le mois précédent, sinon le mois en cours. */
export function defaultSeasonToClose(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - (now.getDate() <= 10 ? 1 : 0), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export { XP_GRADES, getGradeByIndex };
