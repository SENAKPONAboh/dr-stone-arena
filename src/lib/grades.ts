// ===== GRADES CLINIQUES (basés sur l'XP) — Dr. Stone Arena =====

export const XP_GRADES = [
  { min: 0, name: 'Clinicien Bronze', icon: '🥉' },
  { min: 1000, name: 'Clinicien Argent', icon: '🥈' },
  { min: 3000, name: 'Clinicien Or', icon: '🥇' },
  { min: 6000, name: 'Expert Clinicien', icon: '💎' },
];

export function getXpGrade(xp: number) {
  let current = XP_GRADES[0];
  for (const g of XP_GRADES) {
    if (xp >= g.min) current = g;
  }
  const next = XP_GRADES.find(g => g.min > xp) ?? null;
  return { current, next };
}