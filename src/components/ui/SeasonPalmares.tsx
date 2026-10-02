import type { SeasonSummary } from '@/lib/seasons';
import { seasonLabel } from '@/lib/seasons';
import { XP_GRADES, TOP_GRADE, getGradeByIndex } from '@/lib/grades';
import GradeEmblem from './GradeEmblem';

// Palmarès des saisons : combien de fois chaque grade a été atteint en fin de mois (façon « Légendaire ×3 »).
// Couleurs neutres/héritées : s'affiche aussi bien sur un thème de profil sombre que sur le fond de l'application.
export default function SeasonPalmares({ summary, own = false }: { summary: SeasonSummary; own?: boolean }) {
  const neutral = { background: 'rgba(128,128,128,0.12)', border: '1px solid rgba(128,128,128,0.2)' } as const;

  if (summary.total === 0) {
    return (
      <div className="rounded-2xl p-4 text-center text-sm" style={neutral}>
        <p className="font-bold">🏁 Palmarès des saisons</p>
        <p className="mt-1 text-xs opacity-60">
          {own
            ? `Ta première saison se termine à la fin du mois. Atteins ${TOP_GRADE.icon} ${TOP_GRADE.name} avant la clôture pour l'inscrire dans ton profil !`
            : "Aucune saison terminée pour le moment."}
        </p>
      </div>
    );
  }

  const reached = XP_GRADES.filter(g => (summary.gradeCounts[g.index] ?? 0) > 0).reverse(); // du plus haut au plus bas
  const best = getGradeByIndex(reached[0].index);

  return (
    <div className="space-y-3 text-left">
      <p className="text-center text-sm font-bold">🏁 Palmarès des saisons <span className="font-normal opacity-60">· {summary.total} terminée{summary.total > 1 ? 's' : ''}</span></p>

      {/* Meilleur grade atteint, en grand */}
      <div className="flex items-center gap-4 rounded-2xl p-4" style={neutral}>
        <GradeEmblem grade={best} size={64} />
        <div className="min-w-0">
          <p className="grade-color truncate font-display text-base font-extrabold" style={{ '--gt': best.to, '--gf': best.from } as React.CSSProperties}>{best.name}</p>
          <p className="text-sm font-bold">
            atteint <span className="grade-text" style={{ color: best.from }}>×{summary.gradeCounts[best.index]}</span>
            <span className="font-normal opacity-60"> fin de saison</span>
          </p>
        </div>
      </div>

      {/* Tous les grades déjà décrochés */}
      {reached.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {reached.slice(1).map(g => (
            <span key={g.index} className="grade-color rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${g.from}22`, border: `1px solid ${g.from}66`, '--gt': g.to, '--gf': g.from } as React.CSSProperties}>
              {g.icon} {g.name} ×{summary.gradeCounts[g.index]}
            </span>
          ))}
        </div>
      )}

      {/* Dernières saisons */}
      <div className="space-y-1.5">
        {summary.seasons.slice(0, 6).map(s => {
          const g = getGradeByIndex(s.gradeIndex);
          return (
            <div key={s.season} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs" style={neutral}>
              <span className="font-bold capitalize">{seasonLabel(s.season)}</span>
              <span className="grade-color truncate opacity-90" style={{ '--gt': g.to, '--gf': g.from } as React.CSSProperties}>{g.icon} {g.name}</span>
              <span className="whitespace-nowrap font-bold">n°{s.rank} · {s.xp.toLocaleString('fr-FR')} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
