// ===== GRADES DE SAISON (basés sur l'XP du mois) — Dr. Stone Arena =====
// Les XP repartent à zéro à chaque clôture de saison (panel admin → Saison).
// Règle validée (2026-10-23) : le sommet est réservé aux plus RÉGULIERS, et une erreur fait PERDRE des XP
// (comme dans Call of Duty : on peut redescendre de grade).
//   Gain : cas FACILE 10 XP · MOYEN 20 XP · DIFFICILE 35 XP (+5 rapidité, +5 série)
//   Perte : FACILE −5 · MOYEN −10 · DIFFICILE −15 (cas raté, temps écoulé ou cas annulé par l'anti-triche)
//   ≈ 180 XP nets par jour à 8/10 → Légende (4 000) vers le 23e jour ; à 7/10 vers le 28e jour ; à 6/10 on finit vers Grand Maître.
//   (2026-10-25 : sommet abaissé de 5 000 à 4 000, tous les seuils −20 %, pour qu'un étudiant régulier et solide puisse l'atteindre.)
// Pour rendre le sommet plus facile ou plus difficile : changer SEULEMENT les seuils `min` ci-dessous.

// XP retirés pour une mauvaise réponse, selon la difficulté du cas (jamais en dessous de 0 XP au total).
export const XP_LOSS_BY_DIFFICULTY: Record<string, number> = { FACILE: 5, MOYEN: 10, DIFFICILE: 15 };
export function xpLossFor(difficulty: string | null | undefined): number {
  return XP_LOSS_BY_DIFFICULTY[String(difficulty ?? '').trim().toUpperCase()] ?? 10;
}

export type XpGrade = {
  index: number;
  key: string;
  min: number;       // XP du mois nécessaires
  name: string;
  icon: string;
  tagline: string;   // phrase affichée quand on atteint le grade
  from: string;      // dégradé du médaillon / du texte
  to: string;
  glow: string;      // halo (rgba)
};

export const XP_GRADES: XpGrade[] = [
  { index: 0, key: 'NOVICE',      min: 0,    name: "Novice de l'Arène",        icon: '🩺', tagline: "Chaque légende a commencé ici.",             from: '#94a3b8', to: '#e2e8f0', glow: 'rgba(148,163,184,0.55)' },
  { index: 1, key: 'INTERNE',     min: 250, name: 'Interne Prometteur',       icon: '🧪', tagline: "Le diagnostic commence à te sourire.",        from: '#22c55e', to: '#bbf7d0', glow: 'rgba(34,197,94,0.6)' },
  { index: 2, key: 'DIAGNOSTIC',  min: 650,  name: 'Diagnosticien Redoutable', icon: '🎯', tagline: "Tes collègues commencent à te craindre.",     from: '#38bdf8', to: '#e0f2fe', glow: 'rgba(56,189,248,0.65)' },
  { index: 3, key: 'SPECIALISTE', min: 1200, name: 'Spécialiste Reconnu',      icon: '💠', tagline: "Ton expertise ne fait plus de doute.",        from: '#2dd4bf', to: '#ccfbf1', glow: 'rgba(45,212,191,0.7)' },
  { index: 4, key: 'CHIRURGIEN',  min: 1850, name: "Chirurgien d'Élite",       icon: '⚔️', tagline: "Précis. Rapide. Implacable.",                 from: '#a855f7', to: '#f0abfc', glow: 'rgba(168,85,247,0.75)' },
  { index: 5, key: 'MAITRE',      min: 2550, name: 'Maître Clinicien',         icon: '🔥', tagline: "L'Arène connaît ton nom.",                    from: '#f97316', to: '#fde047', glow: 'rgba(249,115,22,0.8)' },
  { index: 6, key: 'GRAND_MAITRE',min: 3300, name: "Grand Maître de l'Arène",  icon: '👑', tagline: "Tu règnes sur le classement.",                from: '#f59e0b', to: '#fef3c7', glow: 'rgba(245,158,11,0.9)' },
  { index: 7, key: 'LEGENDE',     min: 4000, name: 'Légende Immortelle',       icon: '⚡', tagline: "La foudre porte ton nom. Le sommet est à toi.", from: '#8b5cf6', to: '#dbeafe', glow: 'rgba(139,92,246,1)' },
];

export const TOP_GRADE = XP_GRADES[XP_GRADES.length - 1];

export function getXpGrade(xp: number) {
  let current = XP_GRADES[0];
  for (const g of XP_GRADES) {
    if (xp >= g.min) current = g;
  }
  const next = XP_GRADES.find(g => g.min > xp) ?? null;
  return { current, next };
}

/** Progression (0-100) vers le grade suivant. */
export function gradeProgress(xp: number): number {
  const { current, next } = getXpGrade(xp);
  if (!next) return 100;
  return Math.max(0, Math.min(100, Math.round(((xp - current.min) / (next.min - current.min)) * 100)));
}

export const getGradeByIndex = (i: number) => XP_GRADES[Math.max(0, Math.min(XP_GRADES.length - 1, i))];
