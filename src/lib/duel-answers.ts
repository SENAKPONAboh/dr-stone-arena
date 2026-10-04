// ===== RÉPONSES DE DUEL ENREGISTRÉES CÔTÉ SERVEUR =====
// Stockées dans Duel.requesterAnswers / opponentAnswers au fil du jeu (voir /api/duel/answer).

export type StoredAnswer = { caseId: string; answer: string; isCorrect: boolean; timeSpent: number };

export function readStoredAnswers(value: unknown): StoredAnswer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map(a => ({
      caseId: String(a.caseId ?? ''),
      answer: String(a.answer ?? ''),
      isCorrect: a.isCorrect === true,
      timeSpent: Number.isFinite(Number(a.timeSpent)) ? Number(a.timeSpent) : 0,
    }))
    .filter(a => a.caseId);
}

