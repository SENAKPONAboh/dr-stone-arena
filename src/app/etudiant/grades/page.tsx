import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getXpGrade, gradeProgress, XP_GRADES } from '@/lib/grades';
import { getDuelGrade, DUEL_GRADES } from '@/lib/duel';
import { getSeasonSummary } from '@/lib/seasons';
import GradeEmblem from '@/components/ui/GradeEmblem';
import SeasonPalmares from '@/components/ui/SeasonPalmares';

export default async function GradesPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const { current, next } = getXpGrade(user.xp);
  const { current: duelCurrent, next: duelNext } = getDuelGrade(user.duelsWon);
  const seasons = await getSeasonSummary(user.id);

  const progress = gradeProgress(user.xp);
  const duelProgress = duelNext
    ? Math.min(100, Math.round(((user.duelsWon - duelCurrent.minWins) / (duelNext.minWins - duelCurrent.minWins)) * 100))
    : 100;

  return (
    <div className="space-y-8">

      {/* ===== Ton grade de la saison ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-slab p-6 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 0%, ${current.glow}, transparent 65%)` }} />
        <p className="relative mb-4 text-[11px] font-extrabold uppercase tracking-[0.25em] text-mute">Ton grade de la saison</p>
        <div className="relative mb-4 flex justify-center"><GradeEmblem grade={current} size={128} /></div>
        <h1 className="relative font-display text-2xl font-black" style={{ background: `linear-gradient(90deg, ${current.from}, ${current.to})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>
          {current.name}
        </h1>
        <p className="relative mt-1 text-sm text-mute">{current.tagline}</p>
        <p className="relative mt-3 font-display text-lg font-extrabold tabular-nums text-ink">{user.xp.toLocaleString('fr-FR')} <span className="text-xs text-mute">XP ce mois-ci</span></p>

        {next ? (
          <div className="relative mx-auto mt-4 max-w-sm">
            <div className="h-3 overflow-hidden rounded-full bg-slab-2">
              <div className="h-full origin-left rounded-full" style={{ transform: `scaleX(${progress / 100})`, background: `linear-gradient(90deg, ${current.from}, ${next.from})`, transition: 'transform 1s ease-out' }} />
            </div>
            <p className="mt-2 text-xs text-mute">Encore <b className="text-ink">{(next.min - user.xp).toLocaleString('fr-FR')} XP</b> pour {next.icon} <b className="text-ink">{next.name}</b></p>
          </div>
        ) : (
          <p className="relative mt-4 text-sm font-extrabold" style={{ color: current.to }}>🌌 Tu es au sommet de la saison. Garde-le jusqu'à la clôture !</p>
        )}
        <p className="relative mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-mute">
          Les XP repartent à zéro à la fin de chaque mois : tout le monde peut rattraper les autres. Ton grade final est gardé dans ton profil.
        </p>
      </section>

      {/* ===== Palmarès ===== */}
      <section className="rounded-3xl border border-line bg-slab p-5">
        <SeasonPalmares summary={seasons} own />
      </section>

      {/* ===== L'échelle des grades ===== */}
      <section>
        <h2 className="mb-4 font-display text-base font-extrabold text-ink">🏆 L'échelle des grades</h2>
        <div className="space-y-3">
          {[...XP_GRADES].reverse().map(g => {
            const reached = user.xp >= g.min;
            const isCurrent = g.index === current.index;
            return (
              <div key={g.key}
                className="flex items-center gap-4 rounded-2xl border p-4 transition-transform"
                style={{
                  borderColor: isCurrent ? g.from : 'var(--line)',
                  background: isCurrent ? `linear-gradient(135deg, ${g.from}22, transparent)` : 'var(--slab)',
                  boxShadow: isCurrent ? `0 0 24px ${g.glow}` : undefined,
                  opacity: reached ? 1 : 0.7,
                }}>
                <GradeEmblem grade={g} size={56} locked={!reached} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-extrabold" style={{ color: reached ? g.to : undefined }}>{g.name}</p>
                  <p className="text-xs text-mute">{g.min === 0 ? 'Point de départ' : `${g.min.toLocaleString('fr-FR')} XP dans le mois`}</p>
                </div>
                <span className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold" style={isCurrent
                  ? { background: g.from, color: '#0d1311' }
                  : reached ? { background: 'rgba(128,128,128,0.18)' } : { background: 'rgba(128,128,128,0.1)' }}>
                  {isCurrent ? 'ACTUEL' : reached ? '✓ Acquis' : '🔒'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Grades de duel ===== */}
      <section>
        <h2 className="mb-1 font-display text-base font-extrabold text-ink">⚔️ Grades de Duel</h2>
        <p className="mb-4 text-xs text-mute">{duelCurrent.icon} {duelCurrent.name} · 🏆 {user.duelsWon} victoire{user.duelsWon > 1 ? 's' : ''}</p>
        {duelNext && (
          <div className="mb-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-slab-2">
              <div className="h-full rounded-full bg-heart" style={{ width: `${duelProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-mute">Encore <b className="text-ink">{duelNext.minWins - user.duelsWon} victoire{duelNext.minWins - user.duelsWon > 1 ? 's' : ''}</b> pour {duelNext.icon} {duelNext.name}</p>
          </div>
        )}
        <div className="space-y-2">
          {DUEL_GRADES.map(g => {
            const reached = user.duelsWon >= g.minWins;
            const isCurrent = duelCurrent.minWins === g.minWins;
            return (
              <div key={g.minWins} className="flex items-center gap-3 rounded-2xl border border-line bg-slab p-3" style={{ opacity: reached ? 1 : 0.6, borderColor: isCurrent ? 'var(--heart)' : undefined }}>
                <span className="text-2xl">{g.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{g.name}</p>
                  <p className="text-xs text-mute">{g.minWins} victoire{g.minWins > 1 ? 's' : ''} requise{g.minWins > 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs font-bold text-mute">{isCurrent ? '🎯 Actuel' : reached ? '✓' : '🔒'}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-mute">💡 Les grades de duel se gagnent en remportant des duels (5 cas, même niveau). Les défaites ne les font pas perdre, et ils ne sont pas remis à zéro chaque mois.</p>
      </section>
    </div>
  );
}
