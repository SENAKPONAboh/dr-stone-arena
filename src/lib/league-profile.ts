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

/** Ligue de départ (une seule fois) d'après l'XP du mois : ≥ 1 000 → Or, ≥ 500 → Argent, sinon Bronze (≈ 20 % / 28 % / reste, 9 nov.). */
export function startTierFromXp(xp: number) {
  return xp >= 1000 ? 2 : xp >= 500 ? 1 : 0;
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

/**
 * Coffre Premium du mois, AUTOMATIQUE : à la première visite du mois, un membre Premium actif reçoit les UA de son palier
 * (une seule fois par mois, verrouillé). Renvoie le montant reçu, ou 0.
 */
export async function grantMonthlyPremiumUa(user: { id: string; isPremium: boolean; premiumTier: number | null }) {
  const { PREMIUM_MONTHLY_UA } = await import('@/lib/premium');
  const amount = user.isPremium && user.premiumTier ? PREMIUM_MONTHLY_UA[user.premiumTier] ?? 0 : 0;
  if (!amount) return 0;
  try {
    await ensureProfile(user.id);
    const month = monthKey();
    const granted = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ua:' + user.id}))`;
      const p = await tx.leagueProfile.findUnique({ where: { userId: user.id } });
      if (!p || p.premiumUaMonth === month) return false;
      await tx.leagueProfile.update({ where: { userId: user.id }, data: { ua: { increment: amount }, premiumUaMonth: month } });
      await tx.uaLedger.create({ data: { userId: user.id, amount, reason: 'PREMIUM', reference: month } });
      return true;
    });
    if (!granted) return 0;
    const { notifyUser } = await import('@/lib/notify');
    await notifyUser(user.id, `🎁 Coffre Premium du mois : +${amount.toLocaleString('fr-FR')} UA ajoutées à ta boutique !`, '🎁', { url: '/etudiant/boutique' });
    return amount;
  } catch (e) {
    console.error('Coffre Premium :', e);
    return 0;
  }
}
