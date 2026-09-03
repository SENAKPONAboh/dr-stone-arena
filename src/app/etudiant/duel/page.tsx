import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import DuelHub from '@/components/duel/DuelHub';
import { expireStaleDuels } from '@/lib/duel-server';
import { getDailyDuelQuota } from '@/lib/duel';

export default async function DuelPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Expiration paresseuse : invitations > 24h, duels acceptés non joués > 24h
  await expireStaleDuels(user.id);

  const header = (
    <header className="bg-white border-b-2 border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/etudiant" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <h1 className="font-extrabold text-xl text-gray-800">⚔️ Arène des Duels</h1>
        </Link>
      </div>
    </header>
  );

  // Non-premium : carte d'information (pas de données à charger)
  const quotaMax = getDailyDuelQuota(user.premiumTier);
  if (quotaMax === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        {header}
        <main className="max-w-4xl mx-auto px-4 mt-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center max-w-md mx-auto">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Duels réservés aux Premium</h2>
            <p className="text-gray-500 mb-6">Les duels sont une fonctionnalité Premium. Deviens Premium pour affronter les étudiants de ton niveau !</p>
            <Link href="/etudiant/premium" className="inline-block py-3 px-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm shadow-md">
              Voir les offres Premium
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Quota du jour (duels acceptés aujourd'hui — les refus/expirations ne comptent pas)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const quotaUsed = await prisma.duel.count({
    where: {
      OR: [{ requesterId: user.id }, { opponentId: user.id }],
      status: { in: ['ACCEPTE', 'TERMINE'] },
      acceptedAt: { gte: todayStart }
    }
  });

  const invites = await prisma.duel.findMany({
    where: { opponentId: user.id, status: 'EN_ATTENTE' },
    include: { requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const activeDuels = await prisma.duel.findMany({
    where: { status: 'ACCEPTE', OR: [{ requesterId: user.id }, { opponentId: user.id }] },
    include: {
      requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } },
      opponent: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } }
    },
    orderBy: { acceptedAt: 'desc' }
  });

  const recentDuels = await prisma.duel.findMany({
    where: { status: 'TERMINE', OR: [{ requesterId: user.id }, { opponentId: user.id }] },
    include: {
      requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } },
      opponent: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } }
    },
    orderBy: { finalizedAt: 'desc' },
    take: 5
  });

  const claims = await prisma.arenaRewardClaim.findMany({
    where: { userId: user.id },
    select: { threshold: true }
  });

  const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {header}
      <main className="max-w-4xl mx-auto px-4 mt-8">
        <DuelHub
          quotaUsed={quotaUsed}
          quotaMax={quotaMax}
          stats={{ won: user.duelsWon, lost: user.duelsLost, pointsArena: user.pointsArena }}
          invites={invites.map(d => ({
            id: d.id,
            requesterName: nameOf(d.requester),
            requesterImage: d.requester.imageUrl,
            expiresAt: d.expiresAt.toISOString()
          }))}
          active={activeDuels.map(d => {
            const me = d.requesterId === user.id;
            const opp = me ? d.opponent : d.requester;
            return {
              id: d.id,
              opponent: { id: opp.id, name: nameOf(opp), imageUrl: opp.imageUrl },
              myCompleted: me ? d.requesterCompleted : d.opponentCompleted,
              deadline: d.playDeadline ? d.playDeadline.toISOString() : null
            };
          })}
          recent={recentDuels.map(d => {
            const me = d.requesterId === user.id;
            const opp = me ? d.opponent : d.requester;
            return {
              id: d.id,
              opponent: { id: opp.id, name: nameOf(opp), imageUrl: opp.imageUrl },
              won: d.winnerId === null ? null : d.winnerId === user.id,
              myScore: me ? d.requesterScore : d.opponentScore,
              opponentScore: me ? d.opponentScore : d.requesterScore
            };
          })}
          claimed={claims.map(c => c.threshold)}
        />
      </main>
    </div>
  );
}