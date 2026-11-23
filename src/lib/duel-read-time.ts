// ===== TEMPS DE LECTURE MINIMUM D'UN CAS DE DUEL =====
// Le départage à score égal se fait au temps : sans plancher, certains validaient en 1 seconde sans lire.
// Environ 1 seconde pour 4 mots (énoncé + propositions), entre 8 et 20 secondes.
// Côté joueur : le bouton « Valider » reste bloqué pendant ce temps.
// Côté serveur : aucun cas ne compte moins que ce temps dans le total du duel.

export const MIN_READ_SECONDS = 8;
export const MAX_READ_SECONDS = 20;

export function minReadSeconds(statement: string, options: string[] = []): number {
  const words = [statement, ...options].join(' ').split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_READ_SECONDS, Math.max(MIN_READ_SECONDS, Math.ceil(words / 4)));
}
