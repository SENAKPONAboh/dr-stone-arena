const FREE_REGEN_TIME_MS = 24 * 60 * 60 * 1000; // 24 heures pour les gratuits
const PREMIUM_REGEN_TIME_MS = 40 * 60 * 1000;   // 40 minutes pour les Premiums
const MAX_LIVES = 5;

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
  const regenTime = isPremium ? PREMIUM_REGEN_TIME_MS : FREE_REGEN_TIME_MS;

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