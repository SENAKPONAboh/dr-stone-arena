import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import SeasonCloser from '@/components/admin/SeasonCloser';
import { defaultSeasonToClose, seasonLabel } from '@/lib/seasons';
import { getXpGrade, XP_GRADES } from '@/lib/grades';

export default async function AdminSeasonPage() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const top = await prisma.user.findMany({
    where: { role: 'ETUDIANT', xp: { gt: 0 } },
    orderBy: { xp: 'desc' },
    take: 10,
    select: { id: true, prenom: true, nom: true, pseudo: true, xp: true },
  });
  const playersWithXp = await prisma.user.count({ where: { role: 'ETUDIANT', xp: { gt: 0 } } });

  // Saisons déjà clôturées (tolérant si la table n'existe pas encore)
  let tableReady = true;
  let closed: { season: string; players: number; legends: number }[] = [];
  try {
    const rows = await prisma.seasonResult.groupBy({ by: ['season'], _count: { _all: true }, orderBy: { season: 'desc' }, take: 12 });
    const legends = await prisma.seasonResult.groupBy({ by: ['season'], where: { gradeIndex: XP_GRADES.length - 1 }, _count: { _all: true } });
    closed = rows.map(r => ({ season: r.season, players: r._count._all, legends: legends.find(l => l.season === r.season)?._count._all ?? 0 }));
  } catch {
    tableReady = false;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="border-b-2 border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800" aria-label="Retour">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-extrabold text-gray-800">🏁 Saison mensuelle</h1>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-3xl space-y-6 px-4">
        {!tableReady && (
          <div className="rounded-3xl border-2 border-red-100 bg-red-50 p-5 text-sm text-red-700">
            🔧 <b>La table des saisons n'existe pas encore.</b> Exécute une fois cette commande dans le terminal du projet, puis recharge cette page :
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-xs text-gray-800">npx.cmd prisma db execute --file prisma/sql/2026-saisons.sql</pre>
          </div>
        )}

        <div className="rounded-3xl border border-gray-100 bg-white p-5 text-sm text-gray-600 shadow-sm">
          <p className="mb-2 font-extrabold text-gray-800">Comment ça marche</p>
          <p>Les grades dépendent des XP du <b>mois en cours</b>. À la fin du mois, tu clôtures la saison ici : le grade final de chaque étudiant est
            gardé dans son profil (« Légende Immortelle ×2 », etc.) et les XP repartent à zéro pour que tout le monde puisse rattraper les autres.</p>
          <p className="mt-2 text-xs text-gray-400">Grade maximum : {XP_GRADES[XP_GRADES.length - 1].icon} {XP_GRADES[XP_GRADES.length - 1].name} à {XP_GRADES[XP_GRADES.length - 1].min.toLocaleString('fr-FR')} XP.
            Les seuils se règlent dans <code>src/lib/grades.ts</code>.</p>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-gray-400">Classement actuel (top 10)</h2>
          <div className="space-y-2">
            {top.length === 0 && <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-400">Aucun XP pour le moment.</p>}
            {top.map((u, i) => {
              const g = getXpGrade(u.xp).current;
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3">
                  <span className="w-6 text-center font-extrabold text-gray-400">{i + 1}</span>
                  <p className="flex-1 truncate font-bold text-gray-800">{u.pseudo || `${u.prenom} ${u.nom}`}</p>
                  <span className="text-xs text-gray-500">{g.icon} {g.name}</span>
                  <span className="text-sm font-extrabold text-emerald-600">{u.xp.toLocaleString('fr-FR')} XP</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-gray-400">Clôturer</h2>
          <SeasonCloser defaultSeason={defaultSeasonToClose()} playersWithXp={playersWithXp} />
        </section>

        {closed.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-gray-400">Saisons déjà clôturées</h2>
            <div className="space-y-2">
              {closed.map(c => (
                <div key={c.season} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 text-sm">
                  <span className="font-bold capitalize text-gray-800">{seasonLabel(c.season)}</span>
                  <span className="text-gray-500">{c.players} joueur{c.players > 1 ? 's' : ''} · {c.legends} au sommet</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
