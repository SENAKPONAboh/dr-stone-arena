// ===== DURÉE D'UN CAS (chronomètre) — règle unique pour TOUS les modes =====
// Classique, Espace Élite, Rush et duels : la durée dépend uniquement de la difficulté.
//   FACILE → 60 s · MOYEN → 90 s · DIFFICILE → 120 s (2 minutes)

export const CASE_DURATION_BY_DIFFICULTY: Record<string, number> = {
  FACILE: 60,
  MOYEN: 90,
  DIFFICILE: 120,
};

/** Durée du chronomètre en secondes. `fallback` n'est utilisé que si la difficulté est inconnue. */
export function caseDuration(difficulty: string | null | undefined, fallback = 60): number {
  return CASE_DURATION_BY_DIFFICULTY[String(difficulty ?? '').trim().toUpperCase()] ?? fallback;
}
