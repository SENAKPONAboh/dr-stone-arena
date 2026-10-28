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

// Premium ou Pass Élite dont la date est dépassée : traités comme inactifs PARTOUT (routes API comprises),
// même si la purge en base (accueil / layout Élite) n'a pas encore eu lieu. Lecture seule, rien n'est écrit.
function withExpiredAccessRemoved<T extends { isPremium?: boolean; premiumTier?: number | null; premiumExpiresAt?: Date | null; passActive?: boolean; passExpiresAt?: Date | null }>(user: T): T {
  const now = Date.now();
  if (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt).getTime() < now) {
    user = { ...user, isPremium: false, premiumTier: null };
  }
  if (user.passActive && user.passExpiresAt && new Date(user.passExpiresAt).getTime() < now) {
    user = { ...user, passActive: false };
  }
  return user;
}

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
      onboardingCompleted: true,
      universite: true,
      pays: true,
      faculte: true,
      pseudo: true,
      imageUrl: true,
      lastActive: true,
      lives: true,
      chestAvailable: true,
           isPremium: true,
      premiumTier: true,
      duelsWon: true,
      duelsLost: true,
      pointsArena: true,
      lastLifeLostAt: true,
      badges: { include: { badge: true } },
      notifications: true,
      lastDailyRewardClaimedAt: true,
      premiumExpiresAt: true,
      createdAt: true,
      referredById: true,
    }
  });

  // Compte banni : la session (même encore valide) ne donne plus accès à rien.
  if (user?.statut === 'BANNI') return null;
  return user ? withExpiredAccessRemoved(user) : user;
}
// Version allégée pour les routes API et layouts : mêmes vérifications de session,
// mais SANS les relations (badges, notifications) ni les champs lourds (imageUrl, pushSubscription).
export async function getCurrentUserCore() {
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
      pseudo: true,
      role: true,
      statut: true,
      anneeEtude: true,
      xp: true,
      streak: true,
      lives: true,
      chestAvailable: true,
      lastLifeLostAt: true,
      lastDailyRewardClaimedAt: true,
      lastActive: true,
      isPremium: true,
      premiumTier: true,
      premiumExpiresAt: true,
      duelsWon: true,
      duelsLost: true,
      pointsArena: true,
      onboardingCompleted: true,
      uaBalance: true,
      uaLocked: true,
      uaRecharged: true,
      passActive: true,
      passExpiresAt: true,
      streakBeforeReset: true,
      flameProtectedUntil: true,
      createdAt: true,
      referredById: true,
    }
  });

  // Compte banni : la session (même encore valide) ne donne plus accès à rien.
  if (user?.statut === 'BANNI') return null;
  return user ? withExpiredAccessRemoved(user) : user;
}

// Garde des routes réservées à l'administrateur (seed, diagnostic…) : renvoie l'admin ou null.
export async function getAdminOrNull() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}
