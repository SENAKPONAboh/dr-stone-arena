import prisma from '@/lib/prisma';
import { TITLES, FRAMES, THEMES } from './personnalisation-data';

// Seed automatique idempotent du catalogue de personnalisation.
// Le titre EXCLUSIF est créé avec isActive = false : invisible en boutique,
// impossible à acheter — uniquement obtenu via le Coffre Diamond.
export async function getOrCreatePersonalisationCatalog() {
  const all = [
    ...TITLES.map(t => ({
      name: t.name, category: 'TITRE', priceUA: t.priceUA, icon: t.icon, effectKey: t.key,
      description: `Titre « ${t.name} » — affiché avec ton pseudo. Permanent.`,
      isActive: t.rarity !== 'EXCLUSIF',
    })),
    ...FRAMES.map(f => ({
      name: f.name, category: 'CADRE', priceUA: f.priceUA, icon: f.icon, effectKey: f.key,
      description: "Cadre animé autour de ta photo — remplace l'Anneau d'Or quand il est équipé. Permanent.",
      isActive: true,
    })),
    ...THEMES.map(t => ({
      name: t.name, category: 'THEME', priceUA: t.priceUA, icon: t.icon, effectKey: t.key,
      description: "Transforme l'apparence de ton profil. Permanent.",
      isActive: true,
    })),
  ];

  for (const item of all) {
    const existing = await prisma.shopItem.findFirst({ where: { name: item.name, category: item.category } });
    if (!existing) {
      await prisma.shopItem.create({ data: item });
    } else if (existing.effectKey !== item.effectKey || existing.isActive !== item.isActive) {
      await prisma.shopItem.update({
        where: { id: existing.id },
        data: { effectKey: item.effectKey, isActive: item.isActive },
      });
    }
  }

  return prisma.shopItem.findMany({
    where: { category: { in: ['TITRE', 'CADRE', 'THEME'] }, isActive: true },
    orderBy: [{ category: 'asc' }, { priceUA: 'asc' }],
  });
}