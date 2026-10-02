import type { SeasonSummary } from '@/lib/seasons';
import { seasonLabel } from '@/lib/seasons';
import { TOP_GRADE } from '@/lib/grades';
import GradeEmblem from './GradeEmblem';

// Palmarès : UNIQUEMENT pour ceux qui ont terminé un mois au grade maximum (Légende Immortelle).
// Il affiche le nombre de fois où c'est arrivé (« ×2 »). Pour tous les autres, rien ne s'affiche.
export default function SeasonPalmares({ summary }: { summary: SeasonSummary }) {
  const count = summary.gradeCounts[TOP_GRADE.index] ?? 0;
  if (count === 0) return null;

  const months = summary.seasons.filter(s => s.gradeIndex === TOP_GRADE.index);
  const neutral = { background: 'rgba(128,128,128,0.12)', border: '1px solid rgba(139,92,246,0.45)' } as const;

  return (
    <div className="mt-4 space-y-3 text-left">
      <div className="flex items-center gap-4 rounded-2xl p-4" style={neutral}>
        <GradeEmblem grade={TOP_GRADE} size={64} />
        <div className="min-w-0 flex-1">
          <p className="grade-color truncate font-display text-base font-extrabold" style={{ '--gt': TOP_GRADE.to, '--gf': TOP_GRADE.from } as React.CSSProperties}>
            {TOP_GRADE.name}
          </p>
          <p className="text-xs opacity-70">
            {count === 1 ? 'Sommet atteint en fin de saison' : `Sommet atteint en fin de saison, ${count} fois`}
          </p>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1.5 font-display text-lg font-black text-white" style={{ background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)', animation: 'fxStorm 3s linear infinite' }}>
          ×{count}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {months.slice(0, 8).map(s => (
          <span key={s.season} className="rounded-full px-3 py-1 text-xs font-bold capitalize" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)' }}>
            ⚡ {seasonLabel(s.season)}
          </span>
        ))}
      </div>
    </div>
  );
}
