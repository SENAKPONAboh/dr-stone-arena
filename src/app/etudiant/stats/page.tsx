import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function StatsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ETUDIANT') redirect('/login');

  // 1. Récupérer tout l'historique de l'étudiant avec les infos du cas
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    include: {
      clinicalCase: {
        include: { chapter: { include: { subject: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 2. Calculs mathématiques
  const totalCases = attempts.length;
  const correctCases = attempts.filter(a => a.isCorrect).length;
  const successRate = totalCases > 0 ? Math.round((correctCases / totalCases) * 100) : 0;
  
  const totalTime = attempts.reduce((sum, a) => sum + a.timeSpent, 0);
  const avgTime = totalCases > 0 ? Math.round(totalTime / totalCases) : 0;

  // 3. Calcul de la matière favorite et du point faible
  const subjectStats: { [key: string]: { total: number, correct: number } } = {};
  
  attempts.forEach(a => {
    const subjectName = a.clinicalCase.chapter.subject.name;
    if (!subjectStats[subjectName]) {
      subjectStats[subjectName] = { total: 0, correct: 0 };
    }
    subjectStats[subjectName].total++;
    if (a.isCorrect) subjectStats[subjectName].correct++;
  });

  let favoriteSubject = "Aucune";
  let maxAttempts = 0;
  let weakestSubject = "Aucune";
  let lowestSuccessRate = 101;

  for (const [name, stats] of Object.entries(subjectStats)) {
    if (stats.total > maxAttempts) {
      maxAttempts = stats.total;
      favoriteSubject = name;
    }
    const rate = (stats.correct / stats.total) * 100;
    // On prend en compte une matière comme point faible seulement s'il a fait au moins 3 cas
    if (stats.total >= 3 && rate < lowestSuccessRate) {
      lowestSuccessRate = rate;
      weakestSubject = name;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/etudiant" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">Mes Statistiques</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        
        {totalCases === 0 ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Pas encore de données</h2>
            <p className="text-gray-500 mb-6">Résous ton premier cas clinique pour commencer à calculer tes statistiques !</p>
            <Link href="/etudiant/challenge" className="inline-block py-3 px-6 bg-emerald-500 text-white font-bold rounded-2xl">
              Lancer un défi
            </Link>
          </div>
        ) : (
          <>
            {/* Cartes de stats rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Cas résolus</p>
                <p className="text-3xl font-extrabold text-gray-800">{totalCases}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Taux de réussite</p>
                <p className={`text-3xl font-extrabold ${successRate >= 50 ? 'text-emerald-500' : 'text-orange-500'}`}>{successRate}%</p>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Temps moyen</p>
                <p className="text-3xl font-extrabold text-blue-500">{avgTime}s</p>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Bonnes réponses</p>
                <p className="text-3xl font-extrabold text-emerald-500">{correctCases}</p>
              </div>
            </div>

            {/* Analyse par matière */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center gap-4">
                <div className="text-4xl">🧠</div>
                <div>
                  <p className="text-xs font-bold text-blue-400 uppercase">Matière favorite</p>
                  <p className="text-xl font-extrabold text-blue-800">{favoriteSubject}</p>
                  <p className="text-xs text-blue-500">{maxAttempts} cas tentés</p>
                </div>
              </div>

              <div className={`bg-gradient-to-br ${weakestSubject !== "Aucune" ? 'from-red-50 to-orange-50 border-red-100' : 'from-gray-50 to-gray-100 border-gray-100'} p-6 rounded-3xl shadow-sm border flex items-center gap-4`}>
                <div className="text-4xl">⚠️</div>
                <div>
                  <p className={`text-xs font-bold uppercase ${weakestSubject !== "Aucune" ? 'text-red-400' : 'text-gray-400'}`}>Point faible</p>
                  <p className={`text-xl font-extrabold ${weakestSubject !== "Aucune" ? 'text-red-800' : 'text-gray-500'}`}>{weakestSubject}</p>
                  <p className={`text-xs ${weakestSubject !== "Aucune" ? 'text-red-500' : 'text-gray-400'}`}>
                    {weakestSubject !== "Aucune" ? `${Math.round(lowestSuccessRate)}% de réussite` : "Continue de t'entraîner !"}
                  </p>
                </div>
              </div>
            </div>

            {/* Détail par matière */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-extrabold text-gray-800 mb-4">Détail par matière</h2>
              <div className="space-y-4">
                {Object.entries(subjectStats).map(([name, stats]) => {
                  const rate = Math.round((stats.correct / stats.total) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-gray-700">{name}</span>
                        <span className="text-sm font-bold text-gray-500">{rate}% ({stats.total} cas)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}