// ===== SYSTÈME DE VIES — Dr. Stone Arena =====

export const MAX_LIVES = 10;

// Intervalles de régénération (en millisecondes)
// PREMIUM_I / II / III : préparés pour la phase Premium (branchement futur sur les tiers)
// LEGACY_PREMIUM : comportement actuel des Premium (40 min), remplacé en phase Premium
export const REGEN_INTERVALS = {
  FREE: 24 * 60 * 60 * 1000,        // 24 h — utilisateurs gratuits
  LEGACY_PREMIUM: 40 * 60 * 1000,   // 40 min — Premium actuel (transition)
  PREMIUM_I: 12 * 60 * 60 * 1000,   // 12 h — futur Premium I
  PREMIUM_II: 6 * 60 * 60 * 1000,   // 6 h  — futur Premium II
  PREMIUM_III: 60 * 60 * 1000,      // 1 h  — futur Premium III
} as const;

// Point d'entrée unique : renvoie l'intervalle applicable à un utilisateur.
// Aujourd'hui : booléen isPremium. En phase Premium : remplacer par le tier (une seule ligne à changer).
export function getRegenIntervalMs(isPremium: boolean): number {
  return isPremium ? REGEN_INTERVALS.LEGACY_PREMIUM : REGEN_INTERVALS.FREE;
}

export function calculateRegeneratedLives(currentLives: number, lastLifeLostAt: Date | null, isPremium: boolean) {
  // Si l'étudiant a déjà le max de vies, on ne change rien
  if (currentLives >= MAX_LIVES) {
    return { lives: MAX_LIVES, updatedAt: null };
  }

  // Si on n'a pas de date de perte, on ne régénère pas (par sécurité)
  if (!lastLifeLostAt) {
    return { lives: currentLives, updatedAt: null };
  }

  // On choisit le bon minuteur selon l'abonnement
  const regenTime = getRegenIntervalMs(isPremium);

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