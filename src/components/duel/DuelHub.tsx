'use client';

import Link from 'next/link';
import UserSearchBar from '@/components/dashboard/UserSearchBar';
import DuelInvitationBanner from '@/components/dashboard/DuelInvitationBanner';
import ArenaClaimCard from '@/components/duel/ArenaClaimCard';
import { getDuelGrade } from '@/lib/duel';

type Person = { id: string; name: string; imageUrl: string | null };
type Invite = { id: string; requesterName: string; requesterImage: string | null; expiresAt: string };
type ActiveDuel = { id: string; opponent: Person; myCompleted: boolean; deadline: string | null };
type RecentDuel = { id: string; opponent: Person; won: boolean | null; myScore: number | null; opponentScore: number | null };

export default function DuelHub({
  quotaUsed, quotaMax, stats, invites, active, recent, claimed
}: {
  quotaUsed: number; quotaMax: number;
  stats: { won: number; lost: number; pointsArena: number };
  invites: Invite[];
  active: ActiveDuel[];
  recent: RecentDuel[];
  claimed: number[];
}) {
  const { current, next } = getDuelGrade(stats.won);
  const gradeProgress = next
    ? Math.min(100, Math.round(((stats.won - current.minWins) / (next.minWins - current.minWins)) * 100))
    : 100;

  const avatar = (p: Person) => p.imageUrl
    ? <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    : <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">?</div>;

  return (
    <div className="space-y-6">

      {/* Stats + grade + quota */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <div className="bg-emerald-50 px-4 py-2 rounded-xl">
            <p className="text-xs font-bold text-emerald-500 uppercase">Victoires</p>
            <p className="text-xl font-extrabold text-emerald-600">🏆 {stats.won}</p>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-xl">
            <p className="text-xs font-bold text-red-400 uppercase">Défaites</p>
            <p className="text-xl font-extrabold text-red-500">❌ {stats.lost}</p>
          </div>
          <div className="bg-purple-50 px-4 py-2 rounded-xl">
            <p className="text-xs font-bold text-purple-400 uppercase">Points Arena</p>
            <p className="text-xl font-extrabold text-purple-600">🏟️ {stats.pointsArena}</p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-xl">
            <p className="text-xs font-bold text-blue-400 uppercase">Duels du jour</p>
            <p className="text-xl font-extrabold text-blue-600">⚔️ {quotaUsed}/{quotaMax}</p>
          </div>
        </div>

        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grade de Duel</p>
        <p className="font-extrabold text-lg text-gray-800 mb-2">{current.icon} {current.name}</p>
        {next ? (
          <>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
              <div className="bg-gradient-to-r from-red-400 to-orange-500 h-3 rounded-full transition-all" style={{ width: `${gradeProgress}%` }}></div>
            </div>
            <p className="text-xs text-gray-400">{stats.won}/{next.minWins} victoires → {next.icon} {next.name}</p>
          </>
        ) : (
          <p className="text-xs text-gray-400">👑 Grade maximum atteint — Légende Arena !</p>
        )}
      </div>

      {/* Invitations reçues (bannière géante) */}
      {invites.length > 0 && <DuelInvitationBanner invites={invites} />}

      {/* Barre de recherche */}
      <UserSearchBar />

      {/* Duels en cours */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-extrabold text-gray-800 mb-4">⚔️ Duels en cours</h3>
        {active.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-2xl">Aucun duel en cours. Cherche un adversaire ci-dessus !</p>
        ) : (
          <div className="space-y-3">
            {active.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                {avatar(d.opponent)}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{d.opponent.name}</p>
                  <p className="text-xs text-gray-400">Termine avant {d.deadline ? new Date(d.deadline).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>
                <Link href={`/etudiant/duel/${d.id}`} className="py-2 px-5 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-2xl text-sm uppercase tracking-wide hover:from-red-600 hover:to-orange-600 transition-all">
                  {d.myCompleted ? 'Voir' : '⚔️ Jouer'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Récompenses Arena */}
      <ArenaClaimCard pointsArena={stats.pointsArena} claimed={claimed} />

      {/* Résultats récents */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-extrabold text-gray-800 mb-4">📜 Derniers résultats</h3>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-2xl">Aucun duel terminé pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {recent.map(d => (
              <Link key={d.id} href={`/etudiant/duel/${d.id}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                {avatar(d.opponent)}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{d.opponent.name}</p>
                  <p className="text-xs text-gray-400">{d.myScore ?? '—'} / {d.opponentScore ?? '—'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${d.won === true ? 'bg-green-100 text-green-600' : d.won === false ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {d.won === true ? '🏆 Victoire' : d.won === false ? '❌ Défaite' : '🤝 Égalité'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}