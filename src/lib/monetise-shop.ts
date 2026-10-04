// ===== BOUTIQUE MONÉTISÉE — Dr. Stone Arena =====

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { GEL_FLAMME_UA, RESTAURE_FLAMME_UA, ASSURANCE_FLAMME_UA } from '@/lib/monetise';

export const TICKET_RUSH_UA = 10500;
export const BOUCLIER_UA = 17500;
export const SECONDE_CHANCE_UA = 24500;
export const TEMPS_BONUS_UA = 14000;
export const COFFRE_BRONZE_UA = 21000;
export const COFFRE_SILVER_UA = 49000;
export const COFFRE_GOLD_UA = 105000;
export const COFFRE_DIAMOND_UA = 210000;

const CATALOG: { name: string; category: string; priceUA: number; icon: string; effectKey: string; description: string }[] = [
  { name: 'Gel de Flamme', category: 'FLAMME', priceUA: GEL_FLAMME_UA, icon: '🧊', effectKey: 'GEL_FLAMME', description: 'Gèle ta Flamme pour la protéger temporairement. À activer quand TU le décides.' },
  { name: 'Restaure-Flamme', category: 'FLAMME', priceUA: RESTAURE_FLAMME_UA, icon: '🔥', effectKey: 'RESTAURE_FLAMME', description: 'Restaure une Flamme perdue. À activer quand TU le décides.' },
  { name: 'Assurance Flamme', category: 'FLAMME', priceUA: ASSURANCE_FLAMME_UA, icon: '☂️', effectKey: 'ASSURANCE_FLAMME', description: 'Protection préventive de ta Flamme avant une période à risque.' },
  { name: 'Ticket Rush', category: 'RUSH', priceUA: TICKET_RUSH_UA, icon: '🎫', effectKey: 'TICKET_RUSH', description: 'Une tentative de Rush supplémentaire. Distinct du retry direct (paiement immédiat).' },
  { name: 'Bouclier', category: 'RUSH', priceUA: BOUCLIER_UA, icon: '🛡️', effectKey: 'BOUCLIER', description: 'Absorbe une erreur pendant un Rush. Utilisable en pleine tentative.' },
  { name: 'Seconde Chance', category: 'RUSH', priceUA: SECONDE_CHANCE_UA, icon: '🔄', effectKey: 'SECONDE_CHANCE', description: 'Continue ton Rush après une fin brutale, dans les limites prévues.' },
  { name: 'Temps Bonus', category: 'RUSH', priceUA: TEMPS_BONUS_UA, icon: '⏱️', effectKey: 'TEMPS_BONUS', description: 'Ajoute du temps à ton chronomètre de Rush.' },
  { name: 'Coffre Bronze', category: 'COFFRE', priceUA: COFFRE_BRONZE_UA, icon: '🥉', effectKey: 'COFFRE_BRONZE', description: '1 objet courant. Uniquement des objets — jamais d\'UA retirable.' },
  { name: 'Coffre Silver', category: 'COFFRE', priceUA: COFFRE_SILVER_UA, icon: '🥈', effectKey: 'COFFRE_SILVER', description: '1 objet moyen + 1 objet courant. Jamais d\'UA retirable.' },
  { name: 'Coffre Gold', category: 'COFFRE', priceUA: COFFRE_GOLD_UA, icon: '🥇', effectKey: 'COFFRE_GOLD', description: '1 objet rare + 1 objet moyen (+ bonus possible). Jamais d\'UA retirable.' },
  { name: 'Coffre Diamond', category: 'COFFRE', priceUA: COFFRE_DIAMOND_UA, icon: '💎', effectKey: 'COFFRE_DIAMOND', description: 'Le coffre ultime : objets premium garantis + titre exclusif possible. Jamais d\'UA retirable.' },
];

const POOL_COURANT = ['Gel de Flamme', 'Ticket Rush', 'Temps Bonus'];
const POOL_MOYEN = ['Bouclier', 'Restaure-Flamme', 'Seconde Chance'];
const POOL_RARE = ['Assurance Flamme'];

const pick = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];

const CHEST_LOOT: Record<string, () => string[]> = {
  'Coffre Bronze': () => [pick(POOL_COURANT)],
  'Coffre Silver': () => [pick(POOL_MOYEN), pick(POOL_COURANT)],
  'Coffre Gold': () => (Math.random() < 0.5
    ? [pick(POOL_RARE), pick(POOL_MOYEN), pick(POOL_COURANT)]
    : [pick(POOL_RARE), pick(POOL_MOYEN)]),
  // 👑 Titre EXCLUSIF « Légende de l'Arène » — uniquement ici (50 % de chance, ajustable en une ligne)
  'Coffre Diamond': () => [
    pick(POOL_RARE), 'Seconde Chance', pick(POOL_MOYEN), pick(POOL_COURANT),
    ...(Math.random() < 0.5 ? ["Légende de l'Arène"] : []),
  ],
};

export async function getOrCreateShopCatalog() {
  for (const item of CATALOG) {
    const existing = await prisma.shopItem.findFirst({ where: { name: item.name, category: item.category } });
    if (!existing) {
      await prisma.shopItem.create({ data: item });
    } else if (!existing.effectKey || existing.priceUA !== item.priceUA) {
      await prisma.shopItem.update({ where: { id: existing.id }, data: { effectKey: item.effectKey, priceUA: item.priceUA } });
    }
  }
  return prisma.shopItem.findMany({
    where: { category: { in: ['FLAMME', 'RUSH', 'COFFRE'] }, isActive: true },
    orderBy: [{ category: 'asc' }, { priceUA: 'asc' }],
  });
}

export async function openChest(tx: Prisma.TransactionClient, userId: string, chestName: string) {
  const lootNames = (CHEST_LOOT[chestName] ?? CHEST_LOOT['Coffre Bronze'])();
  const granted: { itemId: string; name: string; icon: string | null; description: string | null }[] = [];
  for (const name of lootNames) {
    const shopItem = await tx.shopItem.findFirst({ where: { name } });
    if (!shopItem) continue;
    await tx.userInventory.upsert({
      where: { userId_itemId: { userId, itemId: shopItem.id } },
      create: { userId, itemId: shopItem.id, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
    granted.push({ itemId: shopItem.id, name: shopItem.name, icon: shopItem.icon, description: shopItem.description });
  }
  return granted;
}