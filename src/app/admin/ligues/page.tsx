import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import AdminHeader, { Stat, SectionTitle } from '@/components/admin/ui/AdminHeader';
import { LEAGUES, weekKey, weekStart, getOpenTiers } from '@/lib/league';
import { getNiveauLabel } from '@/lib/niveau';

// ===== STATS & LIGUES (panel admin) : est-ce que les ligues font jouer ? =====
// Lecture seule. Jours comptés à l'heure de Niamey (UTC+1).
const D = 86400000, NI = 3600000;
const localDay = (d: Date) => new Date(d.getTime() + NI).toISOString().slice(0, 10);
const fr = (n: number) => n.toLocaleString('fr-FR');
const RESULT_LABEL: Record<string, string> = { MONTE: 'Montés', RESTE: 'Restés', DESCEND: 'Descendus', ETOILE: 'Étoiles' };
const REASON_LABEL: Record<string, string> = { MONTEE: 'Coffres de montée', ETOILE: 'Coffres étoile', COFFRE: 'Coffres ouverts', DUEL: 'Duels', PREMIUM: 'Coffres Premium', ACHAT: 'Achats boutique', AUTRE: 'Autre' };

export default async function AdminLiguesPage({ searchParams }: { searchParams: Promise<{ jours?: string }> }) {
  const admin = await getCurrentUser();
  if (!admin) redirect('/api/auth/logout');
  if (admin.role !== 'ADMIN') redirect('/login');

  const jours = [7, 14, 30].includes(Number((await searchParams).jours)) ? Number((await searchParams).jours) : 14;
  const nowLocal = new Date(Date.now() + NI);
  const todayStart = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()) - NI);
  const from = new Date(todayStart.getTime() - (jours - 1) * D);
  const week = weekKey();

  const [students, attempts, duelsCreated, duelsDone, members, credits, ledger, profiles, openTiers, pastWeeks, closedPrev] = await Promise.all([
    prisma.user.findMany({ where: { role: 'ETUDIANT' }, select: { id: true, createdAt: true, anneeEtude: true } }),
    prisma.attempt.findMany({ where: { createdAt: { gte: from } }, select: { userId: true, isCorrect: true, createdAt: true } }),
    prisma.duel.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.duel.findMany({ where: { finalizedAt: { gte: from } }, select: { finalizedAt: true } }),
    prisma.leagueMember.findMany({ where: { week }, select: { userId: true, tier: true, groupNo: true, points: true, createdAt: true, user: { select: { prenom: true, nom: true, pseudo: true, anneeEtude: true } } } }),
    prisma.leagueDuelCredit.findMany({ where: { createdAt: { gte: from } }, select: { userId: true, points: true, day: true, week: true } }),
    prisma.uaLedger.findMany({ select: { amount: true, reason: true, reference: true } }),
    prisma.leagueProfile.findMany({ select: { tier: true, ua: true, chestUa: true, stars: true } }),
    getOpenTiers(),
    prisma.leagueMember.groupBy({ by: ['week', 'result'], where: { result: { not: null } }, _count: { _all: true } }),
    prisma.leagueSetting.findUnique({ where: { key: `closed:${weekKey(new Date(weekStart().getTime() - NI))}` } }).catch(() => null),
  ]);

  // --- Jour par jour ---
  const days = Array.from({ length: jours }, (_, i) => localDay(new Date(from.getTime() + i * D + NI)));
  const per: Record<string, { players: Set<string>; cases: number; ok: number; duelsC: number; duelsD: number; signups: number; leagueIn: number; leagueDuels: number }> = {};
  for (const d of days) per[d] = { players: new Set(), cases: 0, ok: 0, duelsC: 0, duelsD: 0, signups: 0, leagueIn: 0, leagueDuels: 0 };
  for (const a of attempts) { const r = per[localDay(a.createdAt)]; if (r) { r.players.add(a.userId); r.cases++; if (a.isCorrect) r.ok++; } }
  for (const d of duelsCreated) { const r = per[localDay(d.createdAt)]; if (r) r.duelsC++; }
  for (const d of duelsDone) { const r = d.finalizedAt && per[localDay(d.finalizedAt)]; if (r) r.duelsD++; }
  for (const s of students) { const r = per[localDay(s.createdAt)]; if (r) r.signups++; }
  for (const m of members) { const r = per[localDay(m.createdAt)]; if (r) r.leagueIn++; }
  for (const c of credits) { const r = per[c.day]; if (r) r.leagueDuels++; }
  const maxPlayers = Math.max(1, ...days.map((d) => per[d].players.size));

  // --- Résumé ---
  const everPlayed = new Set((await prisma.attempt.findMany({ select: { userId: true }, distinct: ['userId'] })).map((a) => a.userId));
  const active7 = new Set(attempts.filter((a) => a.createdAt.getTime() >= Date.now() - 7 * D).map((a) => a.userId));
  const today = per[localDay(new Date())];
  const weekCredits = credits.filter((c) => c.week === week);

  // --- Groupes de la semaine ---
  const groups = new Map<string, typeof members>();
  for (const m of members) { const k = `${m.tier}-${m.groupNo}`; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(m); }
  const groupRows = [...groups.entries()].map(([k, list]) => ({
    k, tier: list[0].tier, groupNo: list[0].groupNo, n: list.length,
    max: Math.max(...list.map((m) => m.points)), avg: Math.round(list.reduce((s, m) => s + m.points, 0) / list.length),
  })).sort((a, b) => b.tier - a.tier || a.groupNo - b.groupNo);
  const top = [...members].sort((a, b) => b.points - a.points).slice(0, 20);
  const byYear: Record<string, { league: number; active7: number; total: number }> = {};
  for (const s of students) {
    const y = getNiveauLabel(s.anneeEtude);
    byYear[y] ??= { league: 0, active7: 0, total: 0 };
    byYear[y].total++;
    if (active7.has(s.id)) byYear[y].active7++;
  }
  for (const m of members) byYear[getNiveauLabel(m.user.anneeEtude)] && byYear[getNiveauLabel(m.user.anneeEtude)].league++;

  // --- UA et boutique ---
  const byReason: Record<string, { n: number; total: number }> = {};
  for (const l of ledger) { byReason[l.reason] ??= { n: 0, total: 0 }; byReason[l.reason].n++; byReason[l.reason].total += l.amount; }
  const buys = ledger.filter((l) => l.reason === 'ACHAT' && l.reference);
  const buyCount: Record<string, number> = {};
  for (const b of buys) buyCount[b.reference!] = (buyCount[b.reference!] ?? 0) + 1;
  const topItemIds = Object.entries(buyCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const itemNames = new Map((await prisma.shopItem.findMany({ where: { id: { in: topItemIds.map(([id]) => id) } }, select: { id: true, name: true } })).map((i) => [i.id, i.name]));
  const uaInCirculation = profiles.reduce((s, p) => s + p.ua, 0);
  const chestsWaiting = profiles.filter((p) => p.chestUa > 0);
  const tierCount = LEAGUES.map((_, i) => profiles.filter((p) => p.tier === i).length);

  // --- Semaines passées ---
  const weeksMap: Record<string, Record<string, number>> = {};
  for (const r of pastWeeks) { weeksMap[r.week] ??= {}; weeksMap[r.week][r.result ?? ''] = r._count._all; }

  const tab = (j: number) => `adm-tab ${jours === j ? 'adm-tab-on' : ''}`;

  return (
    <div className="min-h-screen pb-12">
      <AdminHeader title="Stats & Ligues" subtitle="Est-ce que les ligues font jouer ?" icon="chart" tone="mala" />
      <main className="mx-auto mt-5 max-w-6xl space-y-5 px-4">

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Inscrits" value={fr(students.length)} tone="sky" />
          <Stat label="Actifs (7 jours)" value={fr(active7.size)} tone="mala" />
          <Stat label="Joueurs aujourd'hui" value={fr(today?.players.size ?? 0)} sub={`${fr(today?.cases ?? 0)} cas`} tone="mala" />
          <Stat label="N'ont jamais joué" value={fr(students.filter((s) => !everPlayed.has(s.id)).length)} tone="heart" />
          <Stat label="Dans une ligue (semaine)" value={fr(members.length)} tone="gold" />
          <Stat label="Duels de ligue (semaine)" value={fr(weekCredits.length)} sub={`${fr(new Set(weekCredits.map((c) => c.userId)).size)} joueurs`} tone="flame" />
          <Stat label="UA en circulation" value={fr(uaInCirculation)} tone="gold" />
          <Stat label="Coffres à ouvrir" value={fr(chestsWaiting.length)} sub={`${fr(chestsWaiting.reduce((s, p) => s + p.chestUa, 0))} UA`} tone="gold" />
        </div>

        {/* Jour par jour */}
        <div className="adm-card p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle icon="chart">Activité jour par jour</SectionTitle>
            <div className="flex gap-2">
              {[7, 14, 30].map((j) => <Link key={j} href={`/admin/ligues?jours=${j}`} className={tab(j)}>{j} jours</Link>)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead><tr><th>Jour</th><th>Joueurs</th><th>Cas joués</th><th>Réussite</th><th>Duels lancés</th><th>Duels terminés</th><th>Duels de ligue</th><th>Entrées en ligue</th><th>Inscriptions</th></tr></thead>
              <tbody>
                {[...days].reverse().map((d) => {
                  const r = per[d];
                  return (
                    <tr key={d}>
                      <td className="whitespace-nowrap font-bold">{new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-8 font-bold tabular-nums">{r.players.size}</span>
                          <span className="h-2 rounded-full bg-mala" style={{ width: `${Math.round((r.players.size / maxPlayers) * 90)}px` }} />
                        </div>
                      </td>
                      <td className="tabular-nums">{fr(r.cases)}</td>
                      <td className="tabular-nums">{r.cases ? `${Math.round((r.ok / r.cases) * 100)} %` : '—'}</td>
                      <td className="tabular-nums">{r.duelsC}</td>
                      <td className="tabular-nums">{r.duelsD}</td>
                      <td className="tabular-nums">{r.leagueDuels}</td>
                      <td className="tabular-nums">{r.leagueIn}</td>
                      <td className="tabular-nums">{r.signups}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Groupes de la semaine */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="adm-card p-4 sm:p-6">
            <SectionTitle icon="trophy">Groupes de la semaine ({week})</SectionTitle>
            <p className="mb-3 text-xs text-mute">
              {openTiers} ligues ouvertes · Clôture de la semaine dernière : {closedPrev ? 'faite ✅' : 'pas encore (elle se fait dimanche à minuit)'}
            </p>
            {groupRows.length === 0 ? <p className="text-sm text-mute">Personne n&apos;est encore entré dans une ligue cette semaine.</p> : (
              <table className="adm-table">
                <thead><tr><th>Ligue</th><th>Groupe</th><th>Joueurs</th><th>Meilleur</th><th>Moyenne</th></tr></thead>
                <tbody>
                  {groupRows.map((g) => (
                    <tr key={g.k}>
                      <td className="font-bold" style={{ color: LEAGUES[g.tier].color }}>{LEAGUES[g.tier].name}</td>
                      <td>{g.groupNo}</td>
                      <td className={g.n < 6 ? 'font-bold text-heart' : ''}>{g.n}{g.n < 6 ? ' ⚠️' : ''}</td>
                      <td className="tabular-nums">{g.max}</td>
                      <td className="tabular-nums">{g.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-xs text-mute">Joueurs placés par ligue (au total) : {LEAGUES.map((l, i) => `${l.name} ${tierCount[i]}`).filter((_, i) => i < openTiers).join(' · ')}</p>
          </div>

          <div className="adm-card p-4 sm:p-6">
            <SectionTitle icon="users">Par année</SectionTitle>
            <table className="adm-table">
              <thead><tr><th>Année</th><th>Inscrits</th><th>Actifs 7 j</th><th>Dans une ligue</th></tr></thead>
              <tbody>
                {Object.entries(byYear).sort().map(([y, r]) => (
                  <tr key={y}><td className="font-bold">{y}</td><td>{r.total}</td><td>{r.active7}</td><td>{r.league}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Classement de la semaine */}
        <div className="adm-card p-4 sm:p-6">
          <SectionTitle icon="trophy">Top 20 de la semaine (toutes ligues)</SectionTitle>
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead><tr><th>#</th><th>Étudiant</th><th>Année</th><th>Ligue</th><th>Groupe</th><th>Points</th></tr></thead>
              <tbody>
                {top.map((m, i) => (
                  <tr key={m.userId}>
                    <td className="font-bold">{i + 1}</td>
                    <td>{m.user.pseudo ? `${m.user.pseudo} (${m.user.prenom} ${m.user.nom})` : `${m.user.prenom} ${m.user.nom}`}</td>
                    <td>{getNiveauLabel(m.user.anneeEtude)}</td>
                    <td style={{ color: LEAGUES[m.tier].color }} className="font-bold">{LEAGUES[m.tier].name}</td>
                    <td>{m.groupNo}</td>
                    <td className="font-bold tabular-nums">{m.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* UA et boutique */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="adm-card p-4 sm:p-6">
            <SectionTitle icon="coins">UA de la boutique</SectionTitle>
            <p className="mb-3 text-xs text-mute">Solde séparé de l&apos;Espace Élite, jamais retirable.</p>
            {Object.keys(byReason).length === 0 ? <p className="text-sm text-mute">Aucun mouvement d&apos;UA pour l&apos;instant.</p> : (
              <table className="adm-table">
                <thead><tr><th>Origine</th><th>Nombre</th><th>Total UA</th></tr></thead>
                <tbody>
                  {Object.entries(byReason).map(([r, v]) => (
                    <tr key={r}><td className="font-bold">{REASON_LABEL[r] ?? r}</td><td>{v.n}</td><td className={`tabular-nums ${v.total < 0 ? 'text-heart' : 'text-mala'}`}>{fr(v.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="adm-card p-4 sm:p-6">
            <SectionTitle icon="gem">Objets les plus achetés</SectionTitle>
            {topItemIds.length === 0 ? <p className="text-sm text-mute">Aucun achat en boutique pour l&apos;instant. Les coffres de montée arrivent dimanche à minuit.</p> : (
              <table className="adm-table">
                <thead><tr><th>Objet</th><th>Achats</th></tr></thead>
                <tbody>{topItemIds.map(([id, n]) => <tr key={id}><td>{itemNames.get(id) ?? id}</td><td>{n}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>

        {/* Semaines passées */}
        <div className="adm-card p-4 sm:p-6">
          <SectionTitle icon="flag">Résultats des semaines passées</SectionTitle>
          {Object.keys(weeksMap).length === 0 ? <p className="text-sm text-mute">Pas encore de semaine clôturée : la première clôture a lieu dimanche à minuit.</p> : (
            <table className="adm-table">
              <thead><tr><th>Semaine du</th>{Object.values(RESULT_LABEL).map((l) => <th key={l}>{l}</th>)}</tr></thead>
              <tbody>
                {Object.entries(weeksMap).sort().reverse().map(([w, r]) => (
                  <tr key={w}><td className="font-bold">{w}</td>{Object.keys(RESULT_LABEL).map((k) => <td key={k}>{r[k] ?? 0}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
