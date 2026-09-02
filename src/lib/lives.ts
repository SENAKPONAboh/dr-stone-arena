// ===== SYSTÈME DE VIES — Dr. Stone Arena =====

export const MAX_LIVES = 10;

// Intervalles de régénération (en millisecondes)
export const REGEN_INTERVALS = {
  FREE: 24 * 60 * 60 * 1000,        // 24 h — utilisateurs gratuits
  PREMIUM_I: 12 * 60 * 60 * 1000,   // 12 h — Premium I
  PREMIUM_II: 6 * 60 * 60 * 1000,   // 6 h  — Premium II
  PREMIUM_III: 60 * 60 * 1000,      // 1 h  — Premium III
} as const;

// Point d'entrée unique : renvoie l'intervalle applicable selon le niveau Premium.
// null (ou valeur inconnue) = utilisateur gratuit → 24 h.
export function getRegenIntervalMs(premiumTier: number | null): number {
  if (premiumTier === 3) return REGEN_INTERVALS.PREMIUM_III;
  if (premiumTier === 2) return REGEN_INTERVALS.PREMIUM_II;
  if (premiumTier === 1) return REGEN_INTERVALS.PREMIUM_I;
  return REGEN_INTERVALS.FREE;
}

export function calculateRegeneratedLives(currentLives: number, lastLifeLostAt: Date | null, premiumTier: number | null) {
  // Si l'étudiant a déjà le max de vies, on ne change rien
  if (currentLives >= MAX_LIVES) {
    return { lives: MAX_LIVES, updatedAt: null };
  }

  // Si on n'a pas de date de perte, on ne régénère pas (par sécurité)
  if (!lastLifeLostAt) {
    return { lives: currentLives, updatedAt: null };
  }

  // On choisit le bon minuteur selon le niveau Premium
  const regenTime = getRegenIntervalMs(premiumTier);

  const now = new Date();
  const diffMs = now.getTime() - new Date(lastLifeLostAt).getTime();

  // Combien de tranches de temps se sont écoulées ?
  const livesToRegenerate = Math.floor(diffMs / regenTime);

  if (livesToRegenerate > 0) {
    const newLives = Math.min(MAX_LIVES, currentLives + livesToRegenerate);

    // Si on a atteint le max, on efface la date. Sinon, on met à jour la date.
    const newDate = newLives >= MAX_LIVES ? null : new Date(new Date(lastLifeLostAt).getTime() + (livesToRegenerate * regenTime));

    return { lives: newLives, updatedAt: newDate };
  }

  return { lives: currentLives, updatedAt: null };
}