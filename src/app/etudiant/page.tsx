import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/dashboard/LogoutButton';
import ChestButton from '@/components/dashboard/ChestButton';
import prisma from '@/lib/prisma';
import { calculateRegeneratedLives } from '@/lib/lives';
import Link from 'next/link';
import DailyChallenge from '@/components/dashboard/DailyChallenge';
import LongTermChallenges from '@/components/dashboard/LongTermChallenges';
import NotificationBell from '@/components/dashboard/NotificationBell';
import ThemeToggle from '@/components/dashboard/ThemeToggle';

export default async function EtudiantDashboard() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ETUDIANT') {
    redirect('/login');
  }

  if (user.statut !== 'VALIDE') {
    redirect('/login?error=non_valide');
  }

  // Vérifier si le Premium a expiré
  if (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, premiumExpiresAt: null }
    });
    user.isPremium = false;
  }

  // --- Régénération des vies ---
  const lifeData = calculateRegeneratedLives(user.lives, user.lastLifeLostAt, user.isPremium);
  if (lifeData.lives !== user.lives) {
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lives: lifeData.lives, 
        lastLifeLostAt: lifeData.updatedAt 
      }
    });
    user.lives = lifeData.lives;
  }

  const attemptsCount = await prisma.attempt.count({
    where: { userId: user.id }
  });

  let grade = "🥉 Clinicien Bronze";
  if (user.xp >= 1000) grade = "🥈 Clinicien Argent";
  if (user.xp >= 3000) grade = "🥇 Clinicien Or";
  if (user.xp >= 6000) grade = "💎 Expert Clinicien";

  // --- Calcul du Classement Global ---
  const usersAhead = await prisma.user.count({
    where: { 
      role: 'ETUDIANT',
      statut: 'VALIDE',
      xp: { gt: user.xp }
    }
  });
  const userRank = usersAhead + 1;

  // --- Calculs des Défis ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const attemptsToday = await prisma.attempt.count({
    where: { userId: user.id, createdAt: { gte: todayStart } }
  });
  const dailyClaimed = user.lastDailyRewardClaimedAt ? new Date(user.lastDailyRewardClaimedAt).setHours(0,0,0,0) === todayStart.getTime() : false;

  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const mondayStart = new Date(now);
  mondayStart.setHours(0, 0, 0, 0);
  mondayStart.setDate(now.getDate() - (dayOfWeek - 1));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const weeklyCases = await prisma.attempt.count({
    where: { userId: user.id, createdAt: { gte: mondayStart } }
  });
  const monthlyAttempts = await prisma.attempt.findMany({
    where: { userId: user.id, createdAt: { gte: monthStart } },
    select: { xpEarned: true }
  });
  const monthlyXp = monthlyAttempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0);

  // --- Génération des notifications intelligentes ---
  if (attemptsToday === 0) {
    const todayNotifExists = await prisma.notification.findFirst({
      where: { userId: user.id, createdAt: { gte: todayStart }, message: { contains: "défi quotidien" } }
    });

    if (!todayNotifExists) {
      await prisma.notification.create({
        data: { userId: user.id, message: "Ton défi quotidien est disponible. Joue maintenant pour gagner des XP !", icon: "🧠" }
      });

      if (user.streak > 0) {
        await prisma.notification.create({
          data: { userId: user.id, message: `Attention, tu risques de perdre ta série de ${user.streak} jours si tu ne joues pas aujourd'hui !`, icon: "🔥" }
        });
      }
    }
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const unreadCount = notifications.filter((n: { isRead: boolean }) => !n.isRead).length;

  const topUsers = await prisma.user.findMany({
    where: { 
      role: 'ETUDIANT',
      statut: 'VALIDE'
    },
    orderBy: { xp: 'desc' },
    take: 5,
    select: { id: true, prenom: true, nom: true, xp: true, pseudo: true, imageUrl: true, isPremium: true }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10 transition-colors duration-300">
      
      <header className="bg-white dark:bg-slate-800 border-b-2 border-gray-100 dark:border-slate-700 transition-colors duration-300 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <h1 className="font-extrabold text-lg text-gray-800 dark:text-white hidden sm:block">Dr. Stone Arena</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* La flamme est de retour et visible sur tous les écrans */}
            <span className="bg-orange-100 dark:bg-orange-900/40 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-300 flex items-center gap-1">🔥 {user.streak}</span>
            <span className="bg-emerald-100 dark:bg-emerald-900/40 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-1">⭐ {user.xp}</span>
            <span className="bg-red-100 dark:bg-red-900/40 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">❤️ {user.lives}</span>
            
            <ThemeToggle />
            <NotificationBell initialNotifications={notifications as any} unreadCount={unreadCount} />

            <Link href="/etudiant/profil" className="ml-1">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-9 h-9 rounded-full border-2 border-emerald-500 object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold border-2 border-blue-200 text-sm">
                  {user.prenom.charAt(0)}{user.nom.charAt(0)}
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6">
        {/* Bannière WhatsApp */}
        <a 
          href="Https://chat.whatsapp.com/I1LXEVHIA9d0YFRCzw2umk?s=cl&p=a&ilr=4"
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white p-3 rounded-2xl shadow-md flex items-center justify-center gap-3 mb-6 transition-all group"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          <span className="font-bold text-sm uppercase tracking-wide">Communauté WhatsApp</span>
        </a>

        <DailyChallenge attemptsToday={attemptsToday} claimed={dailyClaimed} />
        <LongTermChallenges weeklyCases={weeklyCases} monthlyXp={monthlyXp} />
        
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Bonjour {user.prenom} 👋</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ton défi médical du jour t'attend. Prêt à progresser ?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Carte Principale (Profil & Lancement) */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col transition-colors duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Grade actuel</p>
                <p className="font-extrabold text-lg text-gray-800 dark:text-white mt-1">{grade}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-xl font-bold text-sm">
                {user.anneeEtude}ème Année
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <div className="flex justify-between mb-1">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Progression globale</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs">{attemptsCount} cas résolus</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div className="bg-gradient-to-r from-emerald-400 to-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(attemptsCount * 10, 100)}%` }}></div>
              </div>
            </div>

            <div className="mt-auto">
              {user.lives > 0 ? (
                <a href="/etudiant/challenge" className="block w-full py-4 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-lg font-extrabold rounded-2xl shadow-md text-center uppercase tracking-wide transition-all mb-4 hover:shadow-lg active:scale-[0.98]">
                  🚀 Commencer le défi
                </a>
              ) : (
                <div className="w-full py-4 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-lg font-extrabold rounded-2xl text-center uppercase tracking-wide cursor-not-allowed mb-4">
                  ❌ Plus de vies
                </div>
              )}

              {/* Vignettes d'accès rapide */}
              <div className="grid grid-cols-3 gap-3">
                <Link href="/etudiant/stats" className="bg-blue-50 dark:bg-slate-700/50 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all group hover:shadow-md">
                  <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide text-center">Stats</span>
                </Link>
                <Link href="/etudiant/history" className="bg-emerald-50 dark:bg-slate-700/50 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-100 dark:border-slate-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all group hover:shadow-md">
                  <span className="text-2xl group-hover:scale-110 transition-transform">📚</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide text-center">Cours</span>
                </Link>
                <Link href="/etudiant/premium" className="bg-yellow-50 dark:bg-slate-700/50 hover:bg-yellow-100 dark:hover:bg-slate-700 border border-yellow-100 dark:border-slate-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all group hover:shadow-md">
                  <span className="text-2xl group-hover:scale-110 transition-transform">👑</span>
                  <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide text-center">Premium</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Carte Classement (Leaderboard) */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-gray-800 dark:text-white">Classement</h3>
              <Link href="/etudiant/leaderboard" className="text-xs font-bold bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-full text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-all">
                Voir tout →
              </Link>
            </div>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-3 mb-4 flex items-center justify-between border border-emerald-100 dark:border-emerald-800">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Ton rang</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-lg">#{userRank}</span>
            </div>

            <div className="space-y-2 flex-grow">
              {topUsers.map((u, index) => (
                <div key={u.id} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${u.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800' : ''}`}>
                  <span className={`font-bold w-6 text-sm ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-gray-300 dark:text-gray-500'}`}>{index + 1}</span>
                  {u.imageUrl ? (
                    <img src={u.imageUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-slate-600" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-300 flex items-center justify-center text-xs font-bold">
                      {u.prenom.charAt(0)}{u.nom.charAt(0)}
                    </div>
                  )}
                  <Link href={`/etudiant/profil/${u.id}`} className="flex-1 truncate flex items-center gap-1 hover:text-blue-600 transition-colors">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{u.pseudo || `${u.prenom} ${u.nom}`}</p>
                    {u.isPremium && <span title="Premium" className="text-xs">👑</span>}
                  </Link>
                  <span className="text-sm font-extrabold text-gray-600 dark:text-gray-300">⭐ {u.xp}</span>
                </div>
              ))}
            </div>
            
            {user.chestAvailable && (
              <div className="mt-4">
                <ChestButton />
              </div>
            )}

            <LogoutButton />
          </div>

        </div>
      </main>
    </div>
  );
}