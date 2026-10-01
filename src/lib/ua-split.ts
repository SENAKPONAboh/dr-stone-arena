// ===== UA MÉRITÉES / UA RECHARGÉES — Dr. Stone Arena =====
// uaBalance = total. uaRecharged = part du solde issue de recharges (utilisable en boutique et pour
// les tentatives, jamais retirable). Retirable = uaBalance − uaRecharged (le mérite).
// Invariant : 0 ≤ uaRecharged ≤ uaBalance.

/** Part du solde que l'étudiant peut convertir en Prime Arena (mérite). */
export function withdrawableUA(balance: number, recharged: number): number {
  return Math.max(0, balance - Math.min(recharged, balance));
}

/** Dépense : on consomme d'abord les UA rechargées (le mérite reste protégé). */
export function spendRechargedFirst(recharged: number, price: number): number {
  return Math.min(Math.max(0, recharged), price); // part prélevée sur uaRecharged
}

/** Retrait d'UA par l'admin (correction négative) : d'abord le mérite, puis le rechargé. */
export function takeEarnedFirst(balance: number, recharged: number, amount: number): number {
  const earned = withdrawableUA(balance, recharged);
  return Math.max(0, amount - earned); // part prélevée sur uaRecharged
}
