import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// Mot de passe d'accès propre au panel ambassadeur (en plus de la connexion au compte).
// Après saisie correcte, un cookie signé (12 h) laisse entrer sans le redemander.

export const PANEL_COOKIE = 'amb_panel';
export const PANEL_HOURS = 12;
export const PANEL_MAX_FAILS = 5;
export const PANEL_LOCK_MINUTES = 15;
export const PANEL_MIN_LENGTH = 6;

const key = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function createPanelToken(userId: string, ambassadorId: string) {
  return new SignJWT({ userId, ambassadorId, scope: 'amb_panel' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PANEL_HOURS}h`)
    .sign(key());
}

export async function hasPanelCookie(userId: string, ambassadorId: string) {
  const token = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload.scope === 'amb_panel' && payload.userId === userId && payload.ambassadorId === ambassadorId;
  } catch {
    return false;
  }
}

/**
 * OPEN        : table pas encore créée → on n'impose rien (l'appli ne casse pas)
 * NEEDS_SETUP : l'ambassadeur n'a pas encore choisi son mot de passe
 * LOCKED      : mot de passe choisi, pas encore saisi (ou session expirée)
 * UNLOCKED    : accès autorisé
 */
export async function getPanelState(userId: string, ambassadorId: string): Promise<'OPEN' | 'NEEDS_SETUP' | 'LOCKED' | 'UNLOCKED'> {
  try {
    const row = await prisma.ambassadorPanelAccess.findUnique({ where: { ambassadorId }, select: { ambassadorId: true } });
    if (!row) return 'NEEDS_SETUP';
    return (await hasPanelCookie(userId, ambassadorId)) ? 'UNLOCKED' : 'LOCKED';
  } catch {
    return 'OPEN';
  }
}
