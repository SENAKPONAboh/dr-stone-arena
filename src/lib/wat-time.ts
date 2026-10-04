// ===== HEURE LOCALE (Niger / Bénin : UTC+1, pas de changement d'heure) =====
// Les serveurs Vercel tournent en UTC : sans ce décalage, « samedi » commencerait à 1 h du matin au lieu de minuit.

const WAT_OFFSET_MS = 60 * 60 * 1000;

/** Jour de la semaine à l'heure locale (0 = dimanche … 6 = samedi). */
export function watDay(date = new Date()): number {
  return new Date(date.getTime() + WAT_OFFSET_MS).getUTCDay();
}

/** Lundi → vendredi (jours où l'on joue les 10 cas Élite du quotidien). */
export function isWeekdayWAT(date = new Date()): boolean {
  const d = watDay(date);
  return d >= 1 && d <= 5;
}
