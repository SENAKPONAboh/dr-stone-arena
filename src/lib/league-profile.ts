// ===== LIGUES : profil, ligues ouvertes et UA de la boutique =====
// Les UA de la boutique (LeagueProfile.ua) sont SÉPARÉES du solde de l'Espace Élite (User.uaBalance) :
// elles ne se retirent jamais en argent. On les gagne avec les coffres de ligue, le coffre Premium et les duels.
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

// --- Barème des UA (réglable ici) ---
export const UA_CHEST_BY_TIER = [0, 3000, 5000, 8000, 12000, 20000]; // coffre de montée, selon la NOUVELLE ligue
export const UA_STAR_CHEST = 4000;                                    // étoile dans la plus haute ligue ouverte
export const UA_DUEL_WIN = 300;                                       // duels au-delà des 3 premiers du jour
export const UA_DUEL_LOSS = 100;
export const FREE_LEAGUE_DUELS = 3;
export { PREMIUM_MONTHLY_UA } from '@/lib/premium';

/** Ligue de départ (une seule fois) d'après l'XP du mois : ≥ 650 → Or, ≥ 250 → Argent, sinon Bronze. */
export function startTierFromXp(xp: number) {
  return xp >= 650 ? 2 : xp >= 250 ? 1 : 0;
}

export async function getOpenTiers(db: Tx | typeof prisma = prisma): Promise<number> {
  try {
    const s = await db.leagueSetting.findUnique({ where: { key: 'openTiers' } });
    const n = Number(s?.value);
    return Number.isFinite(n) && n >= 1 ? Math.min(6, n) : 3;
  } catch {
    return 3;
  }
}

/** Profil de ligue (créé à la première action, avec la ligue de départ). */
export async function ensureProfile(userId: string, db: Tx | typeof prisma = prisma) {
  const existing = await db.leagueProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  const [openTiers, u] = await Promise.all([getOpenTiers(db), db.user.findUnique({ where: { id: userId }, select: { xp: true } })]);
  const tier = Math.min(openTiers - 1, startTierFromXp(u?.xp ?? 0));
  return db.leagueProfile.upsert({ where: { userId }, update: {}, create: { userId, tier } });
}

/** Ajoute (ou retire, si négatif) des UA de boutique, avec une ligne d'historique. */
export async function creditUa(userId: string, amount: number, reason: string, reference: string | null = null, db: Tx | typeof prisma = prisma) {
  if (!amount) return;
  await ensureProfile(userId, db);
  await db.leagueProfile.update({ where: { userId }, data: { ua: { increment: amount } } });
  await db.uaLedger.create({ data: { userId, amount, reason, reference } });
}

/** Met un coffre en attente (ouvert ensuite par l'étudiant, avec l'animation). Les coffres s'additionnent. */
export async function addChest(userId: string, amount: number, label: string, db: Tx | typeof prisma = prisma) {
  await ensureProfile(userId, db);
  await db.leagueProfile.update({ where: { userId }, data: { chestUa: { increment: amount }, chestLabel: label } });
}

/** Mois en cours à l'heure de Niamey, ex. "2026-11". */
export function monthKey(at = new Date()) {
  const d = new Date(at.getTime() + 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
