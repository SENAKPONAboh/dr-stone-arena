// ===== JETON DE DÉBUT DE CAS — mesure du temps CÔTÉ SERVEUR =====
// Quand l'étudiant commence un cas (après avoir accepté la règle anti-triche), le serveur signe un jeton
// contenant l'heure de départ. À l'envoi de la réponse, on compare avec l'heure d'arrivée : le temps ne dépend
// plus uniquement de ce que le navigateur déclare (bonus de rapidité impossible à falsifier, dépassement du chrono détecté).

import { SignJWT, jwtVerify } from 'jose';

const key = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signChallengeToken(userId: string, caseId: string): Promise<string> {
  return new SignJWT({ uid: userId, cid: caseId, kind: 'challenge-start' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(key);
}

/** Retourne les secondes écoulées depuis le début du cas, ou null si le jeton est absent / invalide / d'un autre cas. */
export async function elapsedSinceStart(token: unknown, userId: string, caseId: string): Promise<number | null> {
  if (typeof token !== 'string' || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (payload.kind !== 'challenge-start' || payload.uid !== userId || payload.cid !== caseId) return null;
    if (typeof payload.iat !== 'number') return null;
    return Math.max(0, Date.now() / 1000 - payload.iat);
  } catch {
    return null;
  }
}
