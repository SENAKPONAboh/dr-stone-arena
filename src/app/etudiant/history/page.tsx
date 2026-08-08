import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function HistoryPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ETUDIANT') {
    redirect('/login');
  }

  // Récupérer l'historique de l'étudiant, du plus récent au plus ancien
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      clinicalCase: {
        include: { chapter: { include: { subject: true } } }
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/etudiant" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">Historique des cas</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {attempts.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Aucun historique pour le moment</h2>
            <p className="text-gray-500 mb-6">Commence ton premier défi pour remplir ton journal de progression !</p>
            <Link href="/etudiant/challenge" className="inline-block py-3 px-6 bg-emerald-500 text-white font-bold rounded-2xl">
              Lancer un défi
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">{attempt.clinicalCase.chapter.subject.name} • {attempt.clinicalCase.chapter.name}</span>
                    <h3 className="font-bold text-gray-800 text-lg">{attempt.clinicalCase.title}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${attempt.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {attempt.isCorrect ? '✅ Réussi' : '❌ Raté'}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                  <p><span className="font-bold text-gray-600">Ta réponse :</span> <span className={attempt.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 line-through'}>{attempt.userAnswer}</span></p>
                  {!attempt.isCorrect && (
                    <p><span className="font-bold text-gray-600">Bonne réponse :</span> <span className="text-green-600 font-semibold">{attempt.clinicalCase.correctAnswer}</span></p>
                  )}
                  <p className="text-gray-500 mt-2 pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-600">💡 Explication :</span> {attempt.clinicalCase.explanation}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                  <span>⏱️ {attempt.timeSpent}s</span>
                  <span>{new Date(attempt.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}