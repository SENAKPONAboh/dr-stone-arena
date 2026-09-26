import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getXpGrade, XP_GRADES } from '@/lib/grades';
import { getDuelGrade, DUEL_GRADES } from '@/lib/duel';

export default async function GradesPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const { current: xpCurrent, next: xpNext } = getXpGrade(user.xp);
  const { current: duelCurrent, next: duelNext } = getDuelGrade(user.duelsWon);

  const xpProgress = xpNext
    ? Math.min(100, Math.round(((user.xp - xpCurrent.min) / (xpNext.min - xpCurrent.min)) * 100))
    : 100;
  const duelProgress = duelNext
    ? Math.min(100, Math.round(((user.duelsWon - duelCurrent.minWins) / (duelNext.minWins - duelCurrent.minWins)) * 100))
    : 100;

  const xpRemaining = xpNext ? xpNext.min - user.xp : 0;
  const duelRemaining = duelNext ? duelNext.minWins - user.duelsWon : 0;

  // Rendu d'une ligne de grade
  const gradeRow = (icon: string, name: string, requirement: string, isCurrent: boolean, isReached: boolean) => (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isCurrent
      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 scale-[1.02]'
      : isReached
        ? 'bg-gray-50 dark:bg-slate-800/60 border-gray-100 dark:border-slate-700'
        : 'bg-gray-50 dark:bg-slate-800/40 border-gray-100 dark:border-slate-700 opacity-60'}`}>
      <span className="text-3xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-gray-800 dark:text-white truncate">{name}</p>
        <p className="text-xs text-gray-400">{requirement}</p>
      </div>
      <div className="flex-shrink-0">
        {isCurrent ? (
          <span className="text-xs font-extrabold bg-emerald-500 text-white px-3 py-1.5 rounded-full whitespace-nowrap">🎯 ACTUEL</span>
        ) : isReached ? (
          <span className="text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-300 px-3 py-1.5 rounded-full whitespace-nowrap">✅ Acquis</span>
        ) : (
          <span className="text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-400 px-3 py-1.5 rounded-full whitespace-nowrap">🔒</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ===== En-tête récapitulatif ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">🧠 Ton grade clinique</p>
          <p className="text-2xl font-extrabold text-gray-800 dark:text-white">{xpCurrent.icon} {xpCurrent.name}</p>
          <p className="text-sm text-gray-400 mt-1">⭐ {user.xp.toLocaleString('fr-FR')} XP</p>
          {xpNext && (
            <>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mt-4">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all" style={{ width: `${xpProgress}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Encore <b>{xpRemaining.toLocaleString('fr-FR')} XP</b> pour {xpNext.icon} {xpNext.name}</p>
            </>
          )}
          {!xpNext && <p className="text-xs text-emerald-500 font-bold mt-3">👑 Grade maximum atteint !</p>}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">⚔️ Ton grade de duel</p>
          <p className="text-2xl font-extrabold text-gray-800 dark:text-white">{duelCurrent.icon} {duelCurrent.name}</p>
          <p className="text-sm text-gray-400 mt-1">🏆 {user.duelsWon} victoire{user.duelsWon > 1 ? 's' : ''}</p>
          {duelNext && (
            <>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mt-4">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-red-400 to-orange-500 transition-all" style={{ width: `${duelProgress}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Encore <b>{duelRemaining} victoire{duelRemaining > 1 ? 's' : ''}</b> pour {duelNext.icon} {duelNext.name}</p>
            </>
          )}
          {!duelNext && <p className="text-xs text-emerald-500 font-bold mt-3">👑 Grade maximum atteint !</p>}
        </div>
      </div>

      {/* ===== Grades cliniques ===== */}
      <section>
        <h2 className="text-lg font-extrabold text-gray-800 dark:text-white mb-4">🧠 Grades Cliniques — évolution par XP</h2>
        <div className="space-y-2">
          {XP_GRADES.map(g => (
            <div key={g.min}>
              {gradeRow(g.icon, g.name, `${g.min.toLocaleString('fr-FR')} XP requis`, xpCurrent.min === g.min, user.xp >= g.min)}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Grades de duel ===== */}
      <section>
        <h2 className="text-lg font-extrabold text-gray-800 dark:text-white mb-4">⚔️ Grades de Duel — évolution par victoires</h2>
        <div className="space-y-2">
          {DUEL_GRADES.map(g => (
            <div key={g.minWins}>
              {gradeRow(g.icon, g.name, `${g.minWins} victoire${g.minWins > 1 ? 's' : ''} requise${g.minWins > 1 ? 's' : ''}`, duelCurrent.minWins === g.minWins, user.duelsWon >= g.minWins)}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">💡 Les grades de duel se gagnent en remportant des duels (5 cas, même niveau). Les défaits ne les font pas perdre.</p>
      </section>
    </div>
  );
}