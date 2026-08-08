import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Récupérer l'utilisateur dont l'ID est dans l'URL
  const profileUser = await prisma.user.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      prenom: true,
      nom: true,
      pseudo: true,
      imageUrl: true,
      anneeEtude: true,
      xp: true,
      streak: true,
      isPremium: true,
      badges: { include: { badge: true } }
    }
  });

  if (!profileUser) redirect('/etudiant');

  // Calcul du grade
  let grade = "🥉 Clinicien Bronze";
  if (profileUser.xp >= 1000) grade = "🥈 Clinicien Argent";
  if (profileUser.xp >= 3000) grade = "🥇 Clinicien Or";
  if (profileUser.xp >= 6000) grade = "💎 Expert Clinicien";

  // Styles conditionnels
  const cardStyle = profileUser.isPremium 
    ? "bg-slate-900/80 backdrop-blur-xl border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)] text-white"
    : "bg-white border border-gray-100 shadow-sm text-gray-800";

  const gradeStyle = profileUser.isPremium
    ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 animate-pulse font-extrabold"
    : "font-extrabold text-gray-800";

  const badgeBoxStyle = profileUser.isPremium
    ? "bg-yellow-500/10 border-2 border-yellow-400/30 rounded-2xl"
    : "bg-yellow-50 border-2 border-yellow-100 rounded-2xl";

  return (
    <div className={`min-h-screen pb-10 ${profileUser.isPremium ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' : 'bg-gray-50'}`}>
      
      <header className={`border-b-2 ${profileUser.isPremium ? 'border-white/10 bg-slate-900/50' : 'bg-white border-gray-100'}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/etudiant" className={`flex items-center gap-2 ${profileUser.isPremium ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl">Profil Public</h1>
          </Link>
          {profileUser.isPremium && (
            <span className="bg-yellow-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">👑 Premium</span>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        <div className={`rounded-3xl p-8 text-center transition-all ${cardStyle}`}>
          
          {/* Photo de profil */}
          <div className="relative mx-auto mb-4 w-24 h-24">
            {profileUser.isPremium && (
              <div className="absolute inset-0 rounded-full bg-yellow-400 blur-md animate-pulse"></div>
            )}
            <div className="relative">
              {profileUser.imageUrl ? (
                <img src={profileUser.imageUrl} alt="Profile" className={`w-24 h-24 rounded-full mx-auto object-cover shadow-md ${profileUser.isPremium ? 'border-4 border-yellow-400' : 'border-4 border-emerald-500'}`} />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold mx-auto shadow-md text-4xl ${profileUser.isPremium ? 'bg-blue-500 text-white border-4 border-yellow-400' : 'bg-blue-500 text-white border-4 border-blue-200'}`}>
                  {profileUser.prenom.charAt(0)}{profileUser.nom.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-extrabold">
            {profileUser.pseudo || `${profileUser.prenom} ${profileUser.nom}`}
          </h2>

          {/* Badges rapides (PAS D'EMAIL) */}
          <div className="flex justify-center gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${profileUser.isPremium ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>{profileUser.anneeEtude}ème Année</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${profileUser.isPremium ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>⭐ {profileUser.xp} XP</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${profileUser.isPremium ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-600'}`}>🔥 {profileUser.streak} Jours</span>
          </div>

          {/* Grade */}
          <div className={`mt-6 p-4 rounded-2xl ${profileUser.isPremium ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider ${profileUser.isPremium ? 'text-white/50' : 'text-gray-400'}`}>Grade Actuel</p>
            <p className={`text-xl mt-1 ${gradeStyle}`}>{grade}</p>
          </div>

          {/* Affichage des Badges */}
          <div className={`mt-8 text-left border-t pt-6 ${profileUser.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">Trophées de {profileUser.prenom} 🏆</h3>
            {profileUser.badges.length === 0 ? (
              <p className={`text-sm text-center py-4 rounded-2xl ${profileUser.isPremium ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-400'}`}>Aucun badge débloqué pour le moment.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {profileUser.badges.map((ub) => (
                  <div key={ub.badgeId} className={`flex flex-col items-center justify-center w-24 p-3 ${badgeBoxStyle}`}>
                    <span className="text-4xl mb-1">{ub.badge.icon}</span>
                    <span className={`text-xs font-bold text-center ${profileUser.isPremium ? 'text-yellow-200' : 'text-yellow-800'}`}>{ub.badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}