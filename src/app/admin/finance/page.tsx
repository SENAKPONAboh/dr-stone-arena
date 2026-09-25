import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { PREMIUM_PLANS } from '@/lib/premium';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function FinancePage() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const now = new Date();

  // ===== Bornes de périodes =====
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const dayOfWeek = now.getDay() || 7;
  const startOfWeek = new Date(now); startOfWeek.setHours(0, 0, 0, 0); startOfWeek.setDate(now.getDate() - (dayOfWeek - 1));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // ===== Transactions encaissées (source unique du CA — select minimal, jamais les reçus) =====
  const transactions = await prisma.premiumRequest.findMany({
    where: { status: 'VALIDE', amount: { not: null } },
    select: { amount: true, validatedAt: true, createdAt: true },
  });
  const effDate = (t: { validatedAt: Date | null; createdAt: Date }) => t.validatedAt ?? t.createdAt;
  const caFrom = (start: Date) => transactions.filter(t => effDate(t) >= start).reduce((s, t) => s + (t.amount ?? 0), 0);

  const caToday = caFrom(startOfDay);
  const caWeek = caFrom(startOfWeek);
  const caMonth = caFrom(startOfMonth);
  const caQuarter = caFrom(startOfQuarter);
  const caYear = caFrom(startOfYear);
  const caTotal = transactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  const caPrevMonth = transactions.filter(t => effDate(t) >= startOfPrevMonth && effDate(t) < startOfMonth).reduce((s, t) => s + (t.amount ?? 0), 0);
  const subThisMonth = transactions.filter(t => effDate(t) >= startOfMonth).length;

  let variationPct: number | null = null;
  if (caPrevMonth > 0) variationPct = Math.round(((caMonth - caPrevMonth) / caPrevMonth) * 100);

  // ===== Requêtes parallèles =====
  const [totalStudents, expiredCount, outOfScopeCount, activeByTier, userValidCounts, payers, expensesAgg] = await Promise.all([
    prisma.user.count({ where: { role: 'ETUDIANT' } }),
    prisma.user.count({ where: { role: 'ETUDIANT', isPremium: true, premiumExpiresAt: { lt: now } } }),
    prisma.premiumRequest.count({ where: { status: 'VALIDE', amount: null } }),
    prisma.user.groupBy({
      by: ['premiumTier'],
      where: { role: 'ETUDIANT', isPremium: true, premiumExpiresAt: { gt: now }, premiumTier: { not: null } },
      _count: { _all: true },
    }),
    prisma.premiumRequest.groupBy({ by: ['userId'], where: { status: 'VALIDE' }, _count: { _all: true } }),
    prisma.premiumRequest.findMany({ where: { status: 'VALIDE', amount: { not: null } }, distinct: ['userId'], select: { userId: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
  ]);

  // ===== MRR / ARR / abonnés =====
  const priceByTier: Record<number, number> = {};
  for (const p of PREMIUM_PLANS) priceByTier[p.tier] = p.price;

  let mrr = 0;
  let activePremium = 0;
  const activeByTierMap: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const g of activeByTier) {
    const tier = g.premiumTier ?? 0;
    const count = g._count._all;
    activePremium += count;
    if (activeByTierMap[tier] !== undefined) activeByTierMap[tier] = count;
    mrr += count * (priceByTier[tier] || 0);
  }
  const arr = mrr * 12;
  const renewalsTotal = userValidCounts.reduce((s, g) => s + Math.max(0, g._count._all - 1), 0);

  // ===== Résultat estimé & ratios =====
  const expensesTotal = expensesAgg._sum.amount ?? 0;
  const netResult = caTotal - expensesTotal; // commissions : programme non implémenté (0 en v1)
  const payersCount = payers.length;
  const arpu = totalStudents > 0 ? Math.round(caTotal / totalStudents) : 0;
  const arppu = payersCount > 0 ? Math.round(caTotal / payersCount) : 0;
  const conversionPct = totalStudents > 0 ? Math.round((activePremium / totalStudents) * 100) : 0;

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const kpiCard = (label: string, value: string, color: string, sub?: string) => (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">💰 Centre Financier</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-8">

        {/* ===== 1. CHIFFRE D'AFFAIRES ===== */}
        <section>
          <h2 className="text-lg font-extrabold text-gray-800 mb-4">💵 Chiffre d'affaires (encaissé)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiCard("Aujourd'hui", fmt(caToday), 'text-emerald-600')}
            {kpiCard('Cette semaine', fmt(caWeek), 'text-emerald-600')}
            {kpiCard('Ce mois', fmt(caMonth), 'text-emerald-600', caPrevMonth > 0 ? `Mois précédent : ${fmt(caPrevMonth)}` : "Premier mois d'activité")}
            {kpiCard('Ce trimestre', fmt(caQuarter), 'text-emerald-600')}
            {kpiCard('Cette année', fmt(caYear), 'text-emerald-600')}
            {kpiCard('Depuis le lancement', fmt(caTotal), 'text-emerald-700')}
          </div>
          <div className="mt-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-500">Évolution du mois vs mois précédent :</span>
            {variationPct === null ? (
              <span className="text-sm font-bold text-gray-400">Pas de comparaison disponible</span>
            ) : (
              <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${variationPct >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {variationPct >= 0 ? '▲' : '▼'} {Math.abs(variationPct)} %
              </span>
            )}
            <span className="text-xs text-gray-400">· {subThisMonth} souscription{subThisMonth > 1 ? 's' : ''} validée{subThisMonth > 1 ? 's' : ''} ce mois</span>
          </div>
        </section>

        {/* ===== 2. ABONNEMENTS PREMIUM ===== */}
        <section>
          <h2 className="text-lg font-extrabold text-gray-800 mb-4">👑 Abonnements Premium</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiCard('MRR (revenu mensuel récurrent)', fmt(mrr), 'text-purple-600')}
            {kpiCard('ARR (projection annualisée)', fmt(arr), 'text-purple-500', 'MRR × 12 — non encaissé')}
            {kpiCard('Premium actifs', `${activePremium}`, 'text-yellow-600', `sur ${totalStudents} étudiants`)}
            {kpiCard('Nouvelles souscriptions ce mois', `${subThisMonth}`, 'text-blue-600')}
            {kpiCard('Renouvellements (cumulés)', `${renewalsTotal}`, 'text-blue-500')}
            {kpiCard('Expirés (à purger à leur connexion)', `${expiredCount}`, 'text-orange-500')}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Répartition par niveau</p>
              <div className="space-y-2">
                {PREMIUM_PLANS.map(p => {
                  const count = activeByTierMap[p.tier];
                  const pct = activePremium > 0 ? Math.round((count / activePremium) * 100) : 0;
                  return (
                    <div key={p.tier}>
                      <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                        <span>{p.name}</span>
                        <span>{count} abonné{count > 1 ? 's' : ''} · {pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Taux de conversion Premium</p>
              <p className="text-3xl font-extrabold text-blue-600">{conversionPct} %</p>
              <p className="text-xs text-gray-400 mt-1">{activePremium} Premium actifs / {totalStudents} étudiants inscrits</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                <div className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${conversionPct}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 3. RÉSULTAT ESTIMÉ & RATIOS ===== */}
        <section>
          <h2 className="text-lg font-extrabold text-gray-800 mb-4">📊 Résultat estimé &amp; indicateurs</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpiCard('CA cumulé', fmt(caTotal), 'text-emerald-600')}
            {kpiCard('Dépenses enregistrées', fmt(expensesTotal), 'text-red-500', 'Saisie des dépenses : phase F3')}
            {kpiCard('Commissions ambassadeurs', '0 FCFA', 'text-gray-400', 'Programme non implémenté')}
            {kpiCard('Résultat net estimé', fmt(netResult), netResult >= 0 ? 'text-emerald-700' : 'text-red-600', 'CA − dépenses − commissions')}
            {kpiCard('ARPU / ARPPU', `${fmt(arpu)} / ${fmt(arppu)}`, 'text-indigo-600', `par inscrit / par payant (${payersCount})`)}
          </div>
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-100 p-4 rounded-3xl">
            <p className="text-sm font-bold text-yellow-700 mb-1">🔎 LTV (valeur vie client)</p>
            <p className="text-sm text-yellow-600">Données insuffisantes pour calculer cet indicateur — l'historique d'abonnement est trop récent. Indice disponible : revenu moyen historique par payant = <span className="font-bold">{fmt(arppu)}</span>.</p>
          </div>
        </section>

        {/* ===== 4. NOTES DE TRANSPARENCE ===== */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-3">📝 Notes méthodologiques</h2>
          <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
            <li>CA = montants des demandes Premium <b>validées</b> par l'administration (moment de l'encaissement confirmé).</li>
            <li>{outOfScopeCount} validation{outOfScopeCount > 1 ? 's' : ''} antérieure{outOfScopeCount > 1 ? 's' : ''} au nouveau système de paiement (montant inconnu) {outOfScopeCount > 0 ? '— exclue du CA ci-dessus (historique incomplet)' : ''}.</li>
            <li>« Résultat net estimé » = CA − dépenses − commissions : ce n'est pas un bénéfice comptable (charges non saisies exclues).</li>
            <li>Les commissions d'ambassadeurs (10%) seront intégrées après la phase dédiée au programme.</li>
            <li>Les abonnés « expirés » sont purgés automatiquement à leur prochaine connexion (comportement existant).</li>
          </ul>
        </section>
      </main>
    </div>
  );
}