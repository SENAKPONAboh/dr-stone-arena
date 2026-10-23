// ===== DÉCOUVERTE (7 jours offerts) + AVANTAGE CODE AMBASSADEUR — Dr. Stone Arena =====
// Point d'entrée UNIQUE pour savoir, pour un étudiant donné :
//   - à quelle vitesse ses vies se régénèrent ;
//   - combien de duels il peut jouer par jour.
// Découverte : pendant les 7 jours qui suivent l'inscription, tout ce qui est Premium est ouvert
// (l'Espace Élite reste à part, il dépend uniquement du Pass) et 1 vie revient toutes les 2 h.
// Calculé depuis `createdAt` : aucune colonne en base, rien à activer.
// Code ambassadeur : un étudiant inscrit avec un code (referredById) récupère 1 vie toutes les 18 h au lieu de 24 h.

import { REGEN_INTERVALS, getRegenIntervalMs } from '@/lib/lives';
import { PREMIUM_PLANS } from '@/lib/premium';

export const DISCOVERY_DAYS = 7;
export const DISCOVERY_REGEN_MS = 2 * 60 * 60 * 1000;   // 2 h
export const AMBASSADOR_REGEN_MS = 18 * 60 * 60 * 1000; // 18 h
export const DISCOVERY_DAILY_DUELS = PREMIUM_PLANS[1].dailyDuels; // comme Premium II

export type AccessUser = {
  createdAt: Date | string;
  premiumTier: number | null;
  referredById?: string | null;
};

export function getDiscoveryEnd(createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + DISCOVERY_DAYS * 24 * 60 * 60 * 1000);
}

export function isInDiscovery(user: Pick<AccessUser, 'createdAt'>, now = Date.now()): boolean {
  return getDiscoveryEnd(user.createdAt).getTime() > now;
}

// Jours restants (arrondi au-dessus : « encore 1 jour » jusqu'à la dernière minute), 0 si terminé.
export function discoveryDaysLeft(user: Pick<AccessUser, 'createdAt'>, now = Date.now()): number {
  const ms = getDiscoveryEnd(user.createdAt).getTime() - now;
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}

// Intervalle de régénération réellement appliqué : le plus rapide de tous les avantages.
export function getEffectiveRegenMs(user: AccessUser): number {
  let ms = getRegenIntervalMs(user.premiumTier);
  if (user.referredById && ms > AMBASSADOR_REGEN_MS) ms = AMBASSADOR_REGEN_MS;
  if (isInDiscovery(user) && ms > DISCOVERY_REGEN_MS) ms = DISCOVERY_REGEN_MS;
  return ms;
}

// Libellé court pour l'affichage (« 1/2h », « 1/18h »…).
export function regenLabel(ms: number): string {
  if (ms === REGEN_INTERVALS.PREMIUM_III) return '1/h';
  return `1/${Math.round(ms / (60 * 60 * 1000))}h`;
}

// Quota de duels du jour : Premium, sinon Découverte, sinon 0.
export function getEffectiveDuelQuota(user: AccessUser): number {
  const plan = PREMIUM_PLANS.find(p => p.tier === user.premiumTier);
  const premiumQuota = plan ? plan.dailyDuels : 0;
  return isInDiscovery(user) ? Math.max(premiumQuota, DISCOVERY_DAILY_DUELS) : premiumQuota;
}
