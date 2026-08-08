export default function LongTermChallenges({ weeklyCases, monthlyXp }: { weeklyCases: number, monthlyXp: number }) {
  const weeklyGoal = 15;
  const monthlyGoal = 500;

  const weeklyProgress = Math.min((weeklyCases / weeklyGoal) * 100, 100);
  const monthlyProgress = Math.min((monthlyXp / monthlyGoal) * 100, 100);

  const isWeeklyComplete = weeklyCases >= weeklyGoal;
  const isMonthlyComplete = monthlyXp >= monthlyGoal;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
      <h3 className="font-extrabold text-gray-800 mb-4">🏆 Objectifs Long Terme</h3>
      
      {/* Défi Hebdomadaire */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <span className="text-sm font-bold text-gray-700">Défi de la semaine</span>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isWeeklyComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            {isWeeklyComplete ? 'Terminé !' : `${weeklyCases} / ${weeklyGoal} cas`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${isWeeklyComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`} style={{ width: `${weeklyProgress}%` }}></div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Récompense : +80 XP bonus à la fin de la semaine</p>
      </div>

      {/* Défi Mensuel */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗓️</span>
            <span className="text-sm font-bold text-gray-700">Défi du mois</span>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isMonthlyComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
            {isMonthlyComplete ? 'Terminé !' : `${monthlyXp} / ${monthlyGoal} XP`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${isMonthlyComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-red-500'}`} style={{ width: `${monthlyProgress}%` }}></div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Récompense : +300 XP bonus à la fin du mois</p>
      </div>
    </div>
  );
}