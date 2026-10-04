// ===== LIMITATION DES ESSAIS (anti « devinette » de mots de passe) =====
// Mémoire de l'instance serveur : suffisant pour freiner les essais en rafale, mais pas une protection absolue
// (sur Vercel plusieurs instances coexistent). Une vraie limite globale demanderait une table ou un service dédié.

type Entry = { count: number; first: number };
const store = new Map<string, Entry>();

/** Retourne le nombre de secondes à attendre si la limite est dépassée, sinon 0. */
export function checkRateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000): number {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.first > windowMs) return 0;
  if (e.count >= max) return Math.ceil((e.first + windowMs - now) / 1000);
  return 0;
}

/** Enregistre un échec (mauvais mot de passe, etc.). */
export function recordFailure(key: string, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.first > windowMs) store.set(key, { count: 1, first: now });
  else e.count++;
  if (store.size > 5000) { // ménage : on oublie les plus anciens
    for (const [k, v] of store) if (now - v.first > windowMs) store.delete(k);
  }
}

/** Réussite : on efface le compteur. */
export function clearFailures(key: string) {
  store.delete(key);
}

/** Adresse IP du visiteur (derrière le proxy de Vercel). */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'inconnue';
}
