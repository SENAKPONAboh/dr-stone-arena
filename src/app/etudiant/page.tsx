import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { calculateRegeneratedLives } from '@/lib/lives';
import Link from 'next/link';
import DuelInvitationBanner from '@/components/dashboard/DuelInvitationBanner';
import { expireStaleDuels } from '@/lib/duel-server';
import { getNiveauLabel } from '@/lib/niveau';
import { getDuelGrade } from '@/lib/duel';

export default async function EtudiantDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ETUDIANT') redirect('/login');
  if (user.statut !== 'VALIDE') redirect('/login?error=non_valide');

  const premium = user.isPremium;

  // === LOGIQUE MÉTIER (conservée à l'identique) ===

  // Expiration Premium
  if (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, premiumTier: null, premiumExpiresAt: null }
    });
    user.isPremium = false;
    user.premiumTier = null;
  }

  // Régénération des vies
  const lifeData = calculateRegeneratedLives(user.lives, user.lastLifeLostAt, user.premiumTier);
  if (lifeData.lives !== user.lives) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lives: lifeData.lives, lastLifeLostAt: lifeData.updatedAt }
    });
    user.lives = lifeData.lives;
  }

  // Expiration des duels
  await expireStaleDuels(user.id);

  const attemptsCount = await prisma.attempt.count({ where: { userId: user.id } });

  let grade = "🥉 Clinicien Bronze";
  if (user.xp >= 1000) grade = "🥈 Clinicien Argent";
  if (user.xp >= 3000) grade = "🥇 Clinicien Or";
  if (user.xp >= 6000) grade = "💎 Expert Clinicien";

  // Rangs global + niveau
  const usersAhead = await prisma.user.count({
    where: { role: 'ETUDIANT', statut: 'VALIDE', xp: { gt: user.xp } }
  });
  const userRank = usersAhead + 1;
  let userRankLevel: number | null = null;
  if (user.anneeEtude) {
    const aheadInLevel = await prisma.user.count({
      where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude, xp: { gt: user.xp } }
    });
    userRankLevel = aheadInLevel + 1;
  }

  // Défi du jour (aperçu)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const attemptsToday = await prisma.attempt.count({
    where: { userId: user.id, createdAt: { gte: todayStart } }
  });

  // Duels (aperçu)
  const duelInvites = await prisma.duel.findMany({
    where: { opponentId: user.id, status: 'EN_ATTENTE' },
    include: { requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  const activeDuels = await prisma.duel.count({
    where: { status: 'ACCEPTE', OR: [{ requesterId: user.id }, { opponentId: user.id }] }
  });

  // Notifications intelligentes (conservées)
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

  // Top 3 du niveau
  const topUsers = user.anneeEtude
    ? await prisma.user.findMany({
        where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude },
        orderBy: { xp: 'desc' },
        take: 3,
        select: { id: true, prenom: true, nom: true, xp: true, pseudo: true, imageUrl: true, isPremium: true }
      })
    : [];

  const { current: duelGrade } = getDuelGrade(user.duelsWon);
  const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;

  // === PRÉSENTATION (refonte hub) ===
  const cardClass = premium
    ? 'bg-slate-800/60 backdrop-blur-xl border border-yellow-400/20 text-white'
    : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-white';
  const labelClass = premium ? 'text-white/50' : 'text-gray-400 dark:text-gray-500';
  const valueClass = premium ? 'text-white' : 'text-gray-800 dark:text-white';

  return (
    <div className="space-y-6">

      {/* Invitations de duel (bannière géante — uniquement si présentes) */}
      {duelInvites.length > 0 && (
        <DuelInvitationBanner invites={duelInvites.map(d => ({
          id: d.id,
          requesterName: nameOf(d.requester),
          requesterImage: d.requester.imageUrl,
          expiresAt: d.expiresAt.toISOString()
        }))} />
      )}

      {/* Salutation */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white">Bonjour {user.prenom} 👋</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {grade} · {getNiveauLabel(user.anneeEtude)}
        </p>
      </div>

      {/* Stats vitales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/etudiant/arene" className={`${cardClass} rounded-3xl shadow-sm p-4 hover:shadow-md transition-all`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${labelClass}`}>Streak</p>
          <p className="text-2xl font-extrabold text-orange-500 mt-1">🔥 {user.streak}</p>
        </Link>
        <div className={`${cardClass} rounded-3xl shadow-sm p-4`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${labelClass}`}>Expérience</p>
          <p className="text-2xl font-extrabold text-emerald-500 mt-1">⭐ {user.xp}</p>
        </div>
        <div className={`${cardClass} rounded-3xl shadow-sm p-4`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${labelClass}`}>Vies</p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">❤️ {user.lives}/10</p>
        </div>
        <Link href="/etudiant/leaderboard?scope=niveau" className={`${cardClass} rounded-3xl shadow-sm p-4 hover:shadow-md transition-all`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${labelClass}`}>Rang {userRankLevel ? `(${getNiveauLabel(user.anneeEtude)})` : ''}</p>
          <p className="text-2xl font-extrabold text-blue-500 mt-1">#{userRankLevel ?? userRank}</p>
          <p className={`text-[10px] ${labelClass}`}>Global #{userRank}</p>
        </Link>
      </div>

      {/* CTA principal */}
      {user.lives > 0 ? (
        <Link href="/etudiant/challenge"
          className={`block rounded-3xl shadow-lg p-8 text-center transition-all hover:shadow-xl hover:scale-[1.01] ${premium
            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900'
            : 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'}`}>
          <p className="text-4xl mb-2">🚀</p>
          <p className="text-xl font-extrabold uppercase tracking-wide">Commencer le défi</p>
          <p className={`text-sm mt-1 ${premium ? 'text-slate-900/70' : 'text-white/80'}`}>Un cas clinique de ton niveau t'attend</p>
        </Link>
      ) : (
        <div className="bg-gray-200 dark:bg-slate-700 rounded-3xl p-8 text-center">
          <p className="text-4xl mb-2">❌</p>
          <p className="text-xl font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">Plus de vies</p>
          <p className="text-sm text-gray-400 mt-1">Régénération en cours — {premium ? '1 vie/heure' : '1 vie/24h'}</p>
        </div>
      )}

      {/* Aperçus Arène */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/etudiant/arene" className={`${cardClass} rounded-3xl shadow-sm p-5 hover:shadow-md transition-all`}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500">🎯 Défi du jour</p>
            <span className="text-xs font-bold text-gray-400">{Math.min(attemptsToday, 2)}/2</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Résous 2 cas aujourd'hui → +20 XP</p>
        </Link>
        <Link href="/etudiant/duel" className={`${cardClass} rounded-3xl shadow-sm p-5 hover:shadow-md transition-all`}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-red-500">⚔️ Duels</p>
            {activeDuels > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeDuels} en cours</span>}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{duelGrade.icon} {duelGrade.name} · {user.duelsWon}V / {user.duelsLost}D</p>
        </Link>
        <Link href="/etudiant/stats" className={`${cardClass} rounded-3xl shadow-sm p-5 hover:shadow-md transition-all`}>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-2">📊 Progression</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{attemptsCount} cas résolus</p>
        </Link>
      </div>

      {/* Top 3 du niveau */}
      <div className={`${cardClass} rounded-3xl shadow-sm p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-extrabold">🏆 Top 3 — {getNiveauLabel(user.anneeEtude)}</h2>
          <Link href="/etudiant/leaderboard?scope=niveau" className="text-xs font-bold text-blue-500 hover:underline">Voir tout →</Link>
        </div>
        {topUsers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Pas encore de classement dans ton niveau.</p>
        ) : (
          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <Link key={u.id} href={`/etudiant/profil/${u.id}`}
                className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${u.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                <span className={`font-extrabold w-6 text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`}>{i + 1}</span>
                {u.imageUrl ? (
                  <img src={u.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">{u.prenom.charAt(0)}{u.nom.charAt(0)}</div>
                )}
                <p className="flex-1 text-sm font-bold truncate">{nameOf(u)} {u.isPremium && '👑'}</p>
                <span className="text-sm font-extrabold text-gray-500">⭐ {u.xp}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp discret */}
      <a href="https://chat.whatsapp.com/I1LXEVHIA9d0YFRCzw2umk?s=cl&p=a&ilr=4" target="_blank" rel="noopener noreferrer"
        className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold transition-all ${premium
          ? 'bg-white/5 text-white/60 hover:bg-white/10'
          : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-emerald-600'}`}>
        <span>💬</span> Rejoins la communauté WhatsApp
      </a>
    </div>
  );
}