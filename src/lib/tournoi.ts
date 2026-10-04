// ===== TOURNOI MENSUEL — logique commune (qualification, chrono serveur, classement) =====
// Les 10 premiers de chaque promotion (XP du mois) jouent 20 cas inédits, une seule fois, sur 48 h.
// Les corrections ne sont dévoilées qu'à la clôture : un finaliste qui a joué ne peut pas « souffler » les réponses aux autres.
// Toutes les lectures sont tolérantes : si les tables n'existent pas encore, l'application continue de fonctionner.

import prisma from '@/lib/prisma';
import { caseDuration } from '@/lib/case-duration';

export const TOURNOI_CASES = 20;       // nombre de cas par tournoi
export const TOURNOI_FINALISTS = 10;   // finalistes par promotion
export const TOURNOI_LATE_GRACE = 8;   // secondes de marge réseau au-delà du chrono

export type StoredAnswer = { caseId: string; answer: string; isCorrect: boolean; timeSpent: number };

export type TournoiPhase = 'BROUILLON' | 'A_VENIR' | 'EN_COURS' | 'FERME' | 'TERMINE';

export function readAnswers(value: unknown): StoredAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((a: any) => a && typeof a.caseId === 'string').map((a: any) => ({
    caseId: a.caseId,
    answer: String(a.answer ?? ''),
    isCorrect: !!a.isCorrect,
    timeSpent: Number.isFinite(Number(a.timeSpent)) ? Number(a.timeSpent) : 0,
  }));
}

export function tournoiPhase(t: { status: string; opensAt: Date; closesAt: Date }, now = new Date()): TournoiPhase {
  if (t.status === 'BROUILLON') return 'BROUILLON';
  if (t.status === 'TERMINE') return 'TERMINE';
  if (now < t.opensAt) return 'A_VENIR';
  if (now <= t.closesAt) return 'EN_COURS';
  return 'FERME'; // fenêtre terminée, résultats pas encore publiés par l'administrateur
}

export const PHASE_LABEL: Record<TournoiPhase, string> = {
  BROUILLON: 'En préparation',
  A_VENIR: 'À venir',
  EN_COURS: 'En cours',
  FERME: 'Terminé — résultats bientôt',
  TERMINE: 'Résultats publiés',
};

/** Classement : plus de bonnes réponses d'abord, puis temps total le plus court. Égalité parfaite = même rang. */
export function rankEntries<T extends { score: number; totalTime: number; answers: unknown }>(entries: T[]): (T & { rank: number })[] {
  const played = entries.filter(e => readAnswers(e.answers).length > 0);
  const idle = entries.filter(e => readAnswers(e.answers).length === 0);
  const sorted = [...played].sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);
  let rank = 0;
  let prev: { score: number; totalTime: number } | null = null;
  const ranked = sorted.map((e, i) => {
    if (!prev || prev.score !== e.score || prev.totalTime !== e.totalTime) rank = i + 1;
    prev = e;
    return { ...e, rank };
  });
  const lastRank = ranked.length + 1;
  return [...ranked, ...idle.map(e => ({ ...e, rank: lastRank }))];
}

/** Cas réservés par un tournoi non terminé : ils ne sont proposés nulle part ailleurs (restent inédits). */
export async function getReservedCaseIds(): Promise<string[]> {
  try {
    const rows = await prisma.tournament.findMany({ where: { status: { in: ['BROUILLON', 'PUBLIE'] } }, select: { caseIds: true } });
    return Array.from(new Set(rows.flatMap(r => r.caseIds)));
  } catch {
    return [];
  }
}

/** Trophées d'un étudiant : nombre de fois champion de sa promotion, et nombre de tournois joués en finaliste. */
export async function getTournoiTrophies(userId: string): Promise<{ champion: { anneeEtude: number; season: string }[]; finalist: number }> {
  try {
    const rows = await prisma.tournamentEntry.findMany({
      where: { userId, tournament: { status: 'TERMINE' } },
      select: { rank: true, score: true, tournament: { select: { anneeEtude: true, season: true } } },
      orderBy: { tournament: { season: 'desc' } },
    });
    return {
      champion: rows.filter(r => r.rank === 1 && r.score > 0).map(r => ({ anneeEtude: r.tournament.anneeEtude, season: r.tournament.season })),
      finalist: rows.length,
    };
  } catch {
    return { champion: [], finalist: 0 };
  }
}

/**
 * Règle les cas dont le temps est écoulé (joueur parti en pleine épreuve, application fermée…) :
 * chaque cas expiré compte comme faux et on passe au suivant. Appelée dans une transaction verrouillée.
 */
export async function settleExpiredCases(tx: any, entryId: string): Promise<void> {
  const entry = await tx.tournamentEntry.findUnique({ where: { id: entryId }, include: { tournament: true } });
  if (!entry || entry.finishedAt) return;
  const caseIds: string[] = entry.tournament.caseIds;
  let index = entry.currentIndex;
  let started: Date | null = entry.caseStartedAt;
  const answers = readAnswers(entry.answers);
  let changed = false;

  // Fenêtre du tournoi fermée : plus aucune réponse possible, les cas restants ne comptent pas
  const windowClosed = new Date() > entry.tournament.closesAt;

  while (index < caseIds.length && started) {
    const c = await tx.clinicalCase.findUnique({ where: { id: caseIds[index] }, select: { difficulty: true, durationMax: true } });
    const max = caseDuration(c?.difficulty, c?.durationMax ?? 60);
    const elapsed = (Date.now() - started.getTime()) / 1000;
    if (!windowClosed && elapsed <= max + TOURNOI_LATE_GRACE) break;
    answers.push({ caseId: caseIds[index], answer: 'Aucune réponse (Temps écoulé)', isCorrect: false, timeSpent: max });
    index++;
    started = null; // le cas suivant ne démarre que quand le joueur le consulte
    changed = true;
    if (windowClosed) break;
  }

  if (!changed) return;
  const finished = index >= caseIds.length;
  await tx.tournamentEntry.update({
    where: { id: entry.id },
    data: {
      currentIndex: index,
      caseStartedAt: started,
      answers: answers as any,
      score: answers.filter(a => a.isCorrect).length,
      totalTime: answers.reduce((s, a) => s + a.timeSpent, 0),
      ...(finished ? { finishedAt: new Date() } : {}),
    },
  });
}
