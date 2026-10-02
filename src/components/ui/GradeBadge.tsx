import type { CSSProperties } from 'react';
import type { XpGrade } from '@/lib/grades';

// Pastille de grade : plus le grade est haut, plus elle brille (reflet qui balaie dès « Maître », tempête électrique pour la Légende).
export default function GradeBadge({ grade, size = 'md', className = '' }: { grade: XpGrade; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : size === 'lg' ? 'px-5 py-2 text-base' : 'px-3.5 py-1 text-sm';
  const sweep = grade.index >= 5 ? 'fx-title fx-title--rare' : '';
  const style = {
    background: `linear-gradient(135deg, ${grade.from}38, ${grade.to}22)`,
    border: `1px solid ${grade.from}99`,
    ['--gt' as string]: grade.to,
    ['--gf' as string]: grade.from,
    boxShadow: grade.index >= 3 ? `0 0 ${6 + grade.index * 3}px ${grade.glow}` : undefined,
    textShadow: grade.index >= 4 ? `0 0 10px ${grade.glow}` : undefined,
    animation: grade.index === 7 ? 'fxStorm 3s linear infinite' : undefined,
  } as CSSProperties;
  return (
    <span className={`grade-color relative inline-flex items-center gap-1.5 overflow-hidden rounded-full font-display font-bold ${pad} ${sweep} ${className}`} style={style}>
      <span className="relative z-[1]">{grade.icon}</span>
      <span className="relative z-[1]">{grade.name}</span>
    </span>
  );
}
