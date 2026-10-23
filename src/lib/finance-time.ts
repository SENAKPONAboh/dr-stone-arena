// ===== Périodes du Centre financier à l'heure locale (Niger / Bénin : UTC+1) =====
// Les serveurs Vercel tournent en UTC : sans ce décalage, « aujourd'hui » commencerait à 1 h du matin.

const OFFSET = 60 * 60 * 1000;

/** Année, mois (0-11), jour et jour de semaine (1 = lundi … 7 = dimanche) à l'heure locale. */
export function localParts(d: Date) {
  const l = new Date(d.getTime() + OFFSET);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate(), wd: l.getUTCDay() || 7 };
}

/** Instant réel correspondant à minuit local du jour donné (les débordements de mois/jour sont gérés). */
export function localMidnight(y: number, m: number, d = 1): Date {
  return new Date(Date.UTC(y, m, d) - OFFSET);
}

export function periodStarts(now = new Date()) {
  const p = localParts(now);
  return {
    day: localMidnight(p.y, p.m, p.d),
    week: localMidnight(p.y, p.m, p.d - (p.wd - 1)),
    month: localMidnight(p.y, p.m, 1),
    prevMonth: localMidnight(p.y, p.m - 1, 1),
    year: localMidnight(p.y, 0, 1),
    dayOfMonth: p.d,
    daysInMonth: new Date(Date.UTC(p.y, p.m + 1, 0)).getUTCDate(),
    monthKey: `${p.y}-${String(p.m + 1).padStart(2, '0')}`,
    yearKey: String(p.y),
  };
}

/** Clé « année-mois » locale d'une date, pour ranger les montants par mois. */
export function monthKeyOf(d: Date): string {
  const p = localParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}`;
}
