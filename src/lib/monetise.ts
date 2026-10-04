// ===== PLATEFORME MONÉTISÉE — Dr. Stone Arena =====
// Source unique des valeurs. Anti-pay-to-win : jamais d'XP ni d'avantage académique ici.

export const UA_PER_FCFA = 100;          // 100 UA = 1 FCFA (conversion masquée, visible dans la Cagnotne)
export const UA_PER_CASE = 700; // +700 UA par bonne réponse (cas quotidiens Élite, lundi-vendredi)
export const UA_DAILY_CAP = 7000; // plafond journalier (10 cas × 700)
export const PASS_PRICE_FCFA = 2000;     // Pass Arène Monétisé
export const PASS_RENEWAL_UA = 200000;   // renouvellement par UA
export const WITHDRAWAL_MIN_UA = 100000; // seuil de retrait (= 1 000 FCFA)
export const RECHARGE_MIN_UA = 10000;    // recharge minimum (100 FCFA) — règle validée
export const RECHARGE_STEP_UA = 10000;   // multiples de 10 000 UA uniquement — règle validée
export const RUSH_PALIER_1_UA = 4000; // étage 3 terminé (15 bonnes réponses)
export const RUSH_PALIER_2_UA = 6000; // étage 4 terminé (20 bonnes réponses)
export const RUSH_PALIER_3_UA = 12000; // étage 5 terminé (25 bonnes réponses)
export const RUSH_WEEKEND_CAP_UA = 22000; // plafond du week-end = 4 000 + 6 000 + 12 000
export const RETRY_RUSH_UA = 10500; // retry direct (paiement immédiat — distinct du Ticket de boutique)
export const GEL_FLAMME_UA = 10500;
export const RESTAURE_FLAMME_UA = 21000;
export const ASSURANCE_FLAMME_UA = 49000;
export const RUSH_MAX_ERRORS = 3;
export const RUSH_ETAGE_SIZE = 5;       // bonnes réponses par étage
export const RUSH_ETAGES = 5;            // nombre d'étages (5 × 5 = 25 bonnes réponses)
export const RUSH_FREE_ATTEMPTS = 2;
export const RUSH_FLAME_REQUIRED = 5;    // jours de Flamme dans la semaine

export function uaToFCFA(ua: number): number {
  return Math.floor(ua / UA_PER_FCFA);
}

// Identifiant ISO du week-end courant ("2026-W03") — pour RushSession
export function getWeekendId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}