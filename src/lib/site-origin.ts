// ===== ADRESSE PUBLIQUE DU SITE (https://drstonearena.com) =====
// Derrière Render, `request.url` vaut « http://localhost:10000/… » (adresse interne du serveur).
// Pour fabriquer un lien envoyé à un étudiant ou une redirection, on lit l'adresse réellement demandée
// par le visiteur dans les en-têtes transmis par le proxy (x-forwarded-host / host, x-forwarded-proto).
const FALLBACK = 'https://drstonearena.com';

export function siteOrigin(request: Request): string {
  const h = request.headers;
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
  if (!host || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(host)) {
    // En développement local, l'adresse de la requête est la bonne ; sinon, l'adresse officielle.
    return process.env.NODE_ENV === 'production' ? FALLBACK : new URL(request.url).origin;
  }
  const proto = (h.get('x-forwarded-proto') || '').split(',')[0].trim() || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${host}`;
}

/** Adresse complète d'une page du site, ex. siteUrl(request, '/login'). */
export function siteUrl(request: Request, path: string): URL {
  return new URL(path, siteOrigin(request));
}
