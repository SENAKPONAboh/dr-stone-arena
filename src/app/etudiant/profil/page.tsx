import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Link from 'next/link';
import UpdateProfileForm from '@/components/dashboard/UpdateProfileForm';
import ChangePasswordForm from '@/components/dashboard/ChangePasswordForm';

export default async function ProfilPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  // Calcul du grade
  let grade = "🥉 Clinicien Bronze";
  if (user.xp >= 1000) grade = "🥈 Clinicien Argent";
  if (user.xp >= 3000) grade = "🥇 Clinicien Or";
  if (user.xp >= 6000) grade = "💎 Expert Clinicien";

  // Styles conditionnels selon l'abonnement
  const cardStyle = user.isPremium 
    ? "bg-slate-900/80 backdrop-blur-xl border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)] text-white"
    : "bg-white border border-gray-100 shadow-sm text-gray-800";

  const gradeStyle = user.isPremium
    ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 animate-pulse font-extrabold"
    : "font-extrabold text-gray-800";

  const badgeBoxStyle = user.isPremium
    ? "bg-yellow-500/10 border-2 border-yellow-400/30 rounded-2xl"
    : "bg-yellow-50 border-2 border-yellow-100 rounded-2xl";

  return (
    <div className={`min-h-screen pb-10 ${user.isPremium ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' : 'bg-gray-50'}`}>
      
      <header className={`border-b-2 ${user.isPremium ? 'border-white/10 bg-slate-900/50' : 'bg-white border-gray-100'}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/etudiant" className={`flex items-center gap-2 ${user.isPremium ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl">Mon Profil</h1>
          </a>
          {user.isPremium && (
            <span className="bg-yellow-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">👑 Premium</span>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        <div className={`rounded-3xl p-8 text-center transition-all ${cardStyle}`}>
          
          {/* Photo de profil avec cadre animé Premium */}
          <div className="relative mx-auto mb-4 w-24 h-24">
            {user.isPremium && (
              <div className="absolute inset-0 rounded-full bg-yellow-400 blur-md animate-pulse"></div>
            )}
            <div className="relative">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className={`w-24 h-24 rounded-full mx-auto object-cover shadow-md ${user.isPremium ? 'border-4 border-yellow-400' : 'border-4 border-emerald-500'}`} />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold mx-auto shadow-md text-4xl ${user.isPremium ? 'bg-blue-500 text-white border-4 border-yellow-400' : 'bg-blue-500 text-white border-4 border-blue-200'}`}>
                  {user.prenom.charAt(0)}{user.nom.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-extrabold">
            {user.pseudo || `${user.prenom} ${user.nom}`}
          </h2>
          <p className={user.isPremium ? "text-white/60" : "text-gray-500"}>{user.email}</p>

          {/* Badges rapides */}
          <div className="flex justify-center gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>{user.anneeEtude}ème Année</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>⭐ {user.xp} XP</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-600'}`}>🔥 {user.streak} Jours</span>
          </div>

          {/* Grade avec animation Premium */}
          <div className={`mt-6 p-4 rounded-2xl ${user.isPremium ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider ${user.isPremium ? 'text-white/50' : 'text-gray-400'}`}>Grade Actuel</p>
            <p className={`text-xl mt-1 ${gradeStyle}`}>{grade}</p>
          </div>

          {/* Formulaire de modification (Nouveau composant) */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">Modifier mes informations</h3>
            <UpdateProfileForm currentPseudo={user.pseudo} currentImageUrl={user.imageUrl} isPremium={user.isPremium} currentAnneeEtude={user.anneeEtude} />
          </div>

          {/* Changement de mot de passe */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">🔒 Sécurité (Changer de mot de passe)</h3>
            <ChangePasswordForm />
          </div>

          {/* Affichage des Badges */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">Mes Trophées 🏆</h3>
            {user.badges.length === 0 ? (
              <p className={`text-sm text-center py-4 rounded-2xl ${user.isPremium ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-400'}`}>Aucun badge débloqué pour le moment. Continue tes défis !</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {user.badges.map((ub) => (
                  <div key={ub.badgeId} className={`flex flex-col items-center justify-center w-24 p-3 ${badgeBoxStyle}`}>
                    <span className="text-4xl mb-1">{ub.badge.icon}</span>
                    <span className={`text-xs font-bold text-center ${user.isPremium ? 'text-yellow-200' : 'text-yellow-800'}`}>{ub.badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <LogoutButton />
        </div>
      </main>
    </div>
  );
}