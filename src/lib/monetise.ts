// ===== PLATEFORME MONÉTISÉE — Dr. Stone Arena =====
// Source unique des valeurs. Anti-pay-to-win : jamais d'XP ni d'avantage académique ici.

export const UA_PER_FCFA = 100;          // 100 UA = 1 FCFA (conversion masquée, visible uniquement dans la section retrait)
export const UA_PER_CASE = 1000;         // +1 000 UA par bonne réponse (cas quotidiens monétisés)
export const UA_DAILY_CAP = 10000;       // plafond journalier (10 cas × 1 000)
export const PASS_PRICE_FCFA = 2000;     // Pass Arène Monétisé
export const PASS_RENEWAL_UA = 200000;   // renouvellement par UA
export const WITHDRAWAL_MIN_UA = 200000; // seuil de retrait
export const RUSH_PALIER_1_UA = 10000;   // 10 cas consécutifs
export const RUSH_PALIER_2_UA = 20000;   // 15 cas consécutifs
export const RUSH_PALIER_3_UA = 20000;   // 25 cas consécutifs
export const RUSH_WEEKEND_CAP_UA = 50000;
export const RUSH_TICKET_UA = 15000;
export const GEL_FLAMME_UA = 15000;
export const RESTAURE_FLAMME_UA = 30000;
export const ASSURANCE_FLAMME_UA = 70000;
export const RUSH_MAX_ERRORS = 3;
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