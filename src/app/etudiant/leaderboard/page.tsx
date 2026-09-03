import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getNiveauLabel } from '@/lib/niveau';

export default async function FullLeaderboardPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ETUDIANT') redirect('/login');

  // Onglet : "global" par défaut, "niveau" pour le classement de son niveau
  const { scope } = await searchParams;
  const isGlobal = scope !== 'niveau';

  // --- Classement GLOBAL : tous les étudiants validés, triés par XP ---
  // --- Classement NIVEAU : seulement ceux du même niveau ---
  const where = {
    role: 'ETUDIANT',
    statut: 'VALIDE',
    ...(isGlobal ? {} : { anneeEtude: user.anneeEtude })
  };

  const allUsers = await prisma.user.findMany({
    where,
    orderBy: { xp: 'desc' },
    select: { id: true, prenom: true, nom: true, xp: true, pseudo: true, imageUrl: true, isPremium: true, anneeEtude: true }
  });

  const myLevelLabel = user.anneeEtude ? getNiveauLabel(user.anneeEtude) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/etudiant" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">Classement Général 🏆</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          
          {/* Onglets Global / Mon niveau */}
          <div className="flex gap-3 mb-6">
            <Link
              href="/etudiant/leaderboard"
              className={`flex-1 py-2.5 text-center font-bold rounded-2xl text-sm uppercase tracking-wide transition-all ${isGlobal ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              🌍 Global
            </Link>
            <Link
              href="/etudiant/leaderboard?scope=niveau"
              className={`flex-1 py-2.5 text-center font-bold rounded-2xl text-sm uppercase tracking-wide transition-all ${!isGlobal ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              🎓 {myLevelLabel ? `Mon niveau (${myLevelLabel})` : 'Mon niveau'}
            </Link>
          </div>

          {/* Mode niveau sans niveau défini */}
          {!isGlobal && !user.anneeEtude && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center mb-4">
              <div className="text-4xl mb-2">🎓</div>
              <p className="font-bold text-yellow-700">Niveau non défini</p>
              <p className="text-sm text-yellow-600 mt-1">Ton compte n'a pas de niveau associé, le classement par niveau n'est pas disponible.</p>
            </div>
          )}

          {allUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun étudiant {isGlobal ? 'inscrit' : 'dans ton niveau'} pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((u, index) => (
                <div key={u.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${u.id === user.id ? 'bg-blue-50 border-2 border-blue-200 scale-[1.02]' : 'bg-gray-50 border border-gray-100'}`}>
                  
                  {/* Rang */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-lg flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-600' : 
                    index === 1 ? 'bg-gray-200 text-gray-600' : 
                    index === 2 ? 'bg-orange-100 text-orange-600' : 
                    'bg-white text-gray-400 border border-gray-200'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Photo + Pseudo (Cliquable) */}
                  <Link href={`/etudiant/profil/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    {u.imageUrl ? (
                      <img src={u.imageUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {u.prenom.charAt(0)}{u.nom.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate flex items-center gap-1">
                        {u.pseudo || `${u.prenom} ${u.nom}`}
                        {u.isPremium && <span title="Premium">👑</span>}
                      </p>
                      <p className="text-xs text-gray-400">{getNiveauLabel(u.anneeEtude)}</p>
                    </div>
                  </Link>

                  {/* XP */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-extrabold text-gray-800">⭐ {u.xp}</p>
                    <p className="text-xs text-gray-400">XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}