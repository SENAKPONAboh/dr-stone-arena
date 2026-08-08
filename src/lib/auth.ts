import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

// Créer le token de session (Cookie)
export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expire dans 7 jours
  
  const session = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey);

  return { session, expiresAt };
}

// Vérifier le token (utilisé par le middleware)
export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// Récupérer l'utilisateur connecté (côté serveur)
export async function getCurrentUser() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;

  const payload = await verifySession(sessionCookie);
  if (!payload || !payload.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      anneeEtude: true,
      xp: true,
      streak: true,
      statut: true,
      universite: true,
      faculte: true,
      pseudo: true,
      imageUrl: true,
      lastActive: true,
      lives: true,
      chestAvailable: true,
      isPremium: true,
      lastLifeLostAt: true,
      badges: { include: { badge: true } },
      notifications: true,
      lastDailyRewardClaimedAt: true,
    }
  });

  return user;
}