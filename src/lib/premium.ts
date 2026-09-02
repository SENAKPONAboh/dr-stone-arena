// ===== SYSTÈME PREMIUM — Dr. Stone Arena =====
// Anti-pay-to-win : les plans ne donnent que disponibilité et confort,
// jamais d'XP bonus, de réponses, ni d'avantage compétitif.

export const PREMIUM_PLANS = [
  {
    tier: 1,
    name: 'Premium I',
    price: 1000,
    priceLabel: '1 000 FCFA',
    regenLabel: 'toutes les 12 heures',
    dailyDuels: 3,
  },
  {
    tier: 2,
    name: 'Premium II',
    price: 1500,
    priceLabel: '1 500 FCFA',
    regenLabel: 'toutes les 6 heures',
    dailyDuels: 7,
  },
  {
    tier: 3,
    name: 'Premium III',
    price: 2500,
    priceLabel: '2 500 FCFA',
    regenLabel: 'toutes les heures',
    dailyDuels: 20,
  },
] as const;

export function getPlan(tier: number | null | undefined) {
  return PREMIUM_PLANS.find(p => p.tier === tier) ?? null;
}

export function getPlanLabel(tier: number | null | undefined): string {
  const plan = getPlan(tier);
  return plan ? plan.name : 'Premium';
}