import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import UserSearchBar from '@/components/dashboard/UserSearchBar';
import DailyChallenge from '@/components/dashboard/DailyChallenge';
import LongTermChallenges from '@/components/dashboard/LongTermChallenges';
import ChestButton from '@/components/dashboard/ChestButton';
import PushNotificationManager from '@/components/dashboard/PushNotificationManager';
import DuelInvitationBanner from '@/components/dashboard/DuelInvitationBanner';
import { expireStaleDuels } from '@/lib/duel-server';
import { getDailyDuelQuota, getDuelGrade } from '@/lib/duel';

export default async function ArenePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ETUDIANT') redirect('/login');

  await expireStaleDuels(user.id);

  // --- Données défis ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const attemptsToday = await prisma.attempt.count({
    where: { userId: user.id, createdAt: { gte: todayStart } }
  });
  const dailyClaimed = user.lastDailyRewardClaimedAt
    ? new Date(user.lastDailyRewardClaimedAt).setHours(0, 0, 0, 0) === todayStart.getTime()
    : false;

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
  const monthlyXp = monthlyAttempts.reduce((sum, a) => sum + a.xpEarned, 0);

  // --- Données duels ---
  const invites = await prisma.duel.findMany({
    where: { opponentId: user.id, status: 'EN_ATTENTE' },
    include: { requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } } },
    orderBy: { createdAt: 'desc' }
  });
  const activeDuels = await prisma.duel.count({
    where: { status: 'ACCEPTE', OR: [{ requesterId: user.id }, { opponentId: user.id }] }
  });
  const quotaMax = getDailyDuelQuota(user.premiumTier);
  const quotaUsed = await prisma.duel.count({
    where: {
      OR: [{ requesterId: user.id }, { opponentId: user.id }],
      status: { in: ['ACCEPTE', 'TERMINE'] },
      acceptedAt: { gte: todayStart }
    }
  });
  const { current: duelGrade } = getDuelGrade(user.duelsWon);
  const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;

  return (
    <div className="space-y-6">

      {invites.length > 0 && (
        <DuelInvitationBanner invites={invites.map(d => ({
          id: d.id,
          requesterName: nameOf(d.requester),
          requesterImage: d.requester.imageUrl,
          expiresAt: d.expiresAt.toISOString()
        }))} />
      )}

      {/* Carte principale Arène */}
      <div className={`rounded-3xl shadow-xl border-2 p-6 md:p-8 ${user.isPremium
        ? 'bg-slate-800/60 backdrop-blur-xl border-yellow-400/30 text-white'
        : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">⚔️</span>
              <h1 className="text-2xl font-extrabold">L'Arène</h1>
            </div>
            <p className="text-white/80 text-sm mb-4">Le mode compétitif de Doctor Stone Arena. 5 cas identiques, deux joueurs, un seul vainqueur.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">🏆 {user.duelsWon} victoires</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">🏟️ {user.pointsArena} pts</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{duelGrade.icon} {duelGrade.name}</span>
              {quotaMax > 0 && <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">⚔️ {quotaUsed}/{quotaMax} duels aujourd'hui</span>}
            </div>
            <Link href="/etudiant/duel"
              className="inline-block py-3 px-8 bg-white text-red-600 font-extrabold rounded-2xl uppercase tracking-wide text-sm shadow-md hover:bg-gray-100 transition-all">
              {quotaMax > 0 ? "Entrer dans l'Arène" : 'Découvrir les Duels'}
            </Link>
            {activeDuels > 0 && (
              <p className="text-white/80 text-xs mt-3 font-bold">⚡ {activeDuels} duel{activeDuels > 1 ? 's' : ''} en cours</p>
            )}
          </div>
        </div>
      </div>

      {/* Défis */}
      <DailyChallenge attemptsToday={attemptsToday} claimed={dailyClaimed} />
      <LongTermChallenges weeklyCases={weeklyCases} monthlyXp={monthlyXp} />

      {/* Recherche d'adversaires */}
      <div>
        <h2 className="font-extrabold text-gray-800 dark:text-white mb-3">🔍 Trouver un adversaire</h2>
        <UserSearchBar />
      </div>

      {/* Coffre + notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {user.chestAvailable ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="font-extrabold text-gray-800 dark:text-white mb-4">🎁 Coffre disponible</h3>
            <ChestButton />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 text-center">
            <p className="text-4xl mb-2">🎁</p>
            <p className="font-bold text-gray-600 dark:text-gray-300 text-sm">Coffre verrouillé</p>
            <p className="text-xs text-gray-400 mt-1">Maintiens ta série 7 jours pour le débloquer !</p>
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="font-extrabold text-gray-800 dark:text-white mb-4">🔔 Rester alerté</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Reçois une notification quand un nouveau cas est publié ou qu'on te défie.</p>
          <PushNotificationManager />
        </div>
      </div>
    </div>
  );
}