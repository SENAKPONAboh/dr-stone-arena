import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { PREMIUM_PLANS } from '@/lib/premium';
import ExpenseManager from '@/components/admin/finance/ExpenseManager';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';

const DAY_MS = 24 * 60 * 60 * 1000;

type View = 'globale' | 'evolution' | 'niveaux' | 'methodes' | 'renouvellements' | 'depenses' | 'tresorerie';

const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'globale', label: 'Vue globale', icon: '💰' },
  { key: 'evolution', label: 'Évolution', icon: '📈' },
  { key: 'niveaux', label: 'Par niveau', icon: '👑' },
  { key: 'methodes', label: 'Par méthode', icon: '💳' },
  { key: 'renouvellements', label: 'Renouvellements', icon: '🔄' },
  { key: 'depenses', label: 'Dépenses', icon: '💸' },
  { key: 'tresorerie', label: 'Trésorerie', icon: '💧' },
];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ view?: string; months?: string }> }) {
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

  // ===== Transactions encaissées (source unique) =====
  const transactions = await prisma.premiumRequest.findMany({
    where: { status: 'VALIDE', amount: { not: null } },
    select: { amount: true, validatedAt: true, createdAt: true, tier: true, paymentMethodId: true },
  });
  const effDate = (t: { validatedAt: Date | null; createdAt: Date }) => t.validatedAt ?? t.createdAt;
  const caFrom = (start: Date) => transactions.filter(t => effDate(t) >= start).reduce((s, t) => s + (t.amount ?? 0), 0);

  // ===== Vue active =====
  const { view: viewParam, months: monthsParam } = await searchParams;
  const view = VIEWS.some(v => v.key === viewParam) ? (viewParam as View) : 'globale';
  const monthsCount = [6, 12, 24].includes(parseInt(monthsParam || '')) ? parseInt(monthsParam!) : 12;

  // ===== Requêtes parallèles =====
  const [totalStudents, expiredCount, outOfScopeCount, activeByTier, userValidCounts, payers, expensesAgg, paymentMethods, expensesList] = await Promise.all([
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
    prisma.paymentMethod.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.expense.findMany({ orderBy: { spentAt: 'desc' }, select: { id: true, amount: true, category: true, description: true, vendor: true, spentAt: true } }),
  ]);

  // ===== Données dérivées =====
  const caTotal = transactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  const caMonth = caFrom(startOfMonth);
  const caPrevMonth = transactions.filter(t => effDate(t) >= startOfPrevMonth && effDate(t) < startOfMonth).reduce((s, t) => s + (t.amount ?? 0), 0);
  const subThisMonth = transactions.filter(t => effDate(t) >= startOfMonth).length;
  let variationPct: number | null = null;
  if (caPrevMonth > 0) variationPct = Math.round(((caMonth - caPrevMonth) / caPrevMonth) * 100);

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

  const expensesTotal = expensesAgg._sum.amount ?? 0;
  const netResult = caTotal - expensesTotal;
  const payersCount = payers.length;
  const arpu = totalStudents > 0 ? Math.round(caTotal / totalStudents) : 0;
  const arppu = payersCount > 0 ? Math.round(caTotal / payersCount) : 0;
  const conversionPct = totalStudents > 0 ? Math.round((activePremium / totalStudents) * 100) : 0;

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  // ============================================================
  // VUE : ÉVOLUTION — données mensuelles pour le graphique
  // ============================================================
  const months: { label: string; year: number; month: number; total: number; count: number }[] = [];
  const startAnalysis = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(startAnalysis.getFullYear(), startAnalysis.getMonth() + i, 1);
    months.push({ label: d.toLocaleDateString('fr-FR', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), total: 0, count: 0 });
  }
  for (const t of transactions) {
    const d = effDate(t);
    const idx = months.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (idx >= 0) { months[idx].total += t.amount ?? 0; months[idx].count++; }
  }
  const maxMonthCA = Math.max(...months.map(m => m.total), 1);

  // ============================================================
  // VUE : NIVEAUX — revenus par tier sur les périodes clés
  // ============================================================
  const tierData = PREMIUM_PLANS.map(p => {
    const revTotal = transactions.filter(t => t.tier === p.tier).reduce((s, t) => s + (t.amount ?? 0), 0);
    const revMonth = transactions.filter(t => t.tier === p.tier && effDate(t) >= startOfMonth).reduce((s, t) => s + (t.amount ?? 0), 0);
    const revYear = transactions.filter(t => t.tier === p.tier && effDate(t) >= startOfYear).reduce((s, t) => s + (t.amount ?? 0), 0);
    const subsTotal = transactions.filter(t => t.tier === p.tier).length;
    const subsMonth = transactions.filter(t => t.tier === p.tier && effDate(t) >= startOfMonth).length;
    const contribution = caTotal > 0 ? Math.round((revTotal / caTotal) * 100) : 0;
    return { ...p, revTotal, revMonth, revYear, subsTotal, subsMonth, contribution, activeCount: activeByTierMap[p.tier] };
  });

  // ============================================================
  // VUE : MÉTHODES — CA par PaymentMethod
  // ============================================================
  const methodData = paymentMethods.map(m => {
    const txs = transactions.filter(t => t.paymentMethodId === m.id);
    const revTotal = txs.reduce((s, t) => s + (t.amount ?? 0), 0);
    const revMonth = txs.filter(t => effDate(t) >= startOfMonth).reduce((s, t) => s + (t.amount ?? 0), 0);
    const share = caTotal > 0 ? Math.round((revTotal / caTotal) * 100) : 0;
    return { method: m, txCount: txs.length, revTotal, revMonth, share };
  });
  const noMethodCount = transactions.filter(t => !t.paymentMethodId).length;
  const noMethodRev = transactions.filter(t => !t.paymentMethodId).reduce((s, t) => s + (t.amount ?? 0), 0);

  // ============================================================
  // VUE : RENOUVELLEMENTS — churn indicatif
  // ============================================================
  // Abonnés qui ont une expiration dans le passé (ont laissé expirer sans renouveler)
  const expiredUsers = await prisma.user.count({
    where: { role: 'ETUDIANT', isPremium: true, premiumExpiresAt: { lt: now } }
  });
  // Utilisateurs ayant eu ≥ 2 validations (ont renouvelé au moins une fois)
  const repeatPayers = userValidCounts.filter(g => g._count._all >= 2).length;
  const oneTimePayers = userValidCounts.filter(g => g._count._all === 1).length;
  const churnRate = (repeatPayers + oneTimePayers) > 0
    ? Math.round((oneTimePayers / (repeatPayers + oneTimePayers)) * 100)
    : 0;

  // ============================================================
  // F3 : DÉPENSES & TRÉSORERIE
  // ============================================================
  const expensesMonth = expensesList.filter(e => e.spentAt >= startOfMonth).reduce((s, e) => s + e.amount, 0);
  const expensesQuarter = expensesList.filter(e => e.spentAt >= startOfQuarter).reduce((s, e) => s + e.amount, 0);
  const expensesYear = expensesList.filter(e => e.spentAt >= startOfYear).reduce((s, e) => s + e.amount, 0);

  const expensesByCategory = EXPENSE_CATEGORIES
    .map(c => ({ ...c, total: expensesList.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCategoryExpense = Math.max(...expensesByCategory.map(c => c.total), 1);

  const cashMonths = months.map(m => {
    const exp = expensesList.filter(e => e.spentAt.getFullYear() === m.year && e.spentAt.getMonth() === m.month).reduce((s, e) => s + e.amount, 0);
    return { ...m, expenses: exp, solde: m.total - exp };
  });

  const caQuarter = caFrom(startOfQuarter);
  const caYear = caFrom(startOfYear);
  const treso = [
    { label: 'Ce mois', entrees: caMonth, sorties: expensesMonth },
    { label: 'Ce trimestre', entrees: caQuarter, sorties: expensesQuarter },
    { label: 'Cette année', entrees: caYear, sorties: expensesYear },
    { label: 'Depuis le lancement', entrees: caTotal, sorties: expensesTotal },
  ].map(p => ({ ...p, solde: p.entrees - p.sorties }));

  // ============================================================
  // RENDU
  // ============================================================
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

        {/* ===== ONGLETS ===== */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map(v => (
              <Link key={v.key} href={`/admin/finance${v.key !== 'globale' ? `?view=${v.key}` : ''}${v.key === 'evolution' ? `&months=${monthsCount}` : ''}`}
                className={`py-2.5 px-4 rounded-2xl text-sm font-bold uppercase tracking-wide transition-all ${view === v.key
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {v.icon} {v.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ================================================== */}
        {/* VUE : GLOBALE (F1 — inchangée)                     */}
        {/* ================================================== */}
        {view === 'globale' && (
          <>
            <section>
              <h2 className="text-lg font-extrabold text-gray-800 mb-4">💵 Chiffre d'affaires (encaissé)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpiCard("Aujourd'hui", fmt(caFrom(startOfDay)), 'text-emerald-600')}
                {kpiCard('Cette semaine', fmt(caFrom(startOfWeek)), 'text-emerald-600')}
                {kpiCard('Ce mois', fmt(caMonth), 'text-emerald-600', caPrevMonth > 0 ? `Mois précédent : ${fmt(caPrevMonth)}` : "Premier mois d'activité")}
                {kpiCard('Ce trimestre', fmt(caFrom(startOfQuarter)), 'text-emerald-600')}
                {kpiCard('Cette année', fmt(caFrom(startOfYear)), 'text-emerald-600')}
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
                <p className="text-sm text-yellow-600">Données insuffisantes pour calculer cet indicateur — l&apos;historique d&apos;abonnement est trop récent. Indice disponible : revenu moyen historique par payant = <span className="font-bold">{fmt(arppu)}</span>.</p>
              </div>
            </section>

            <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-3">📝 Notes méthodologiques</h2>
              <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                <li>CA = montants des demandes Premium <b>validées</b> par l&apos;administration (moment de l&apos;encaissement confirmé).</li>
                <li>{outOfScopeCount} validation{outOfScopeCount > 1 ? 's' : ''} antérieure{outOfScopeCount > 1 ? 's' : ''} au nouveau système de paiement (montant inconnu) {outOfScopeCount > 0 ? '— exclue du CA ci-dessus (historique incomplet)' : ''}.</li>
                <li>« Résultat net estimé » = CA − dépenses − commissions : ce n&apos;est pas un bénéfice comptable (charges non saisies exclues).</li>
                <li>Les commissions d&apos;ambassadeurs (10%) seront intégrées après la phase dédiée au programme.</li>
                <li>Les abonnés « expirés » sont purgés automatiquement à leur prochaine connexion (comportement existant).</li>
              </ul>
            </section>
          </>
        )}

        {/* ================================================== */}
        {/* VUE : ÉVOLUTION                                    */}
        {/* ================================================== */}
        {view === 'evolution' && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">📈 Évolution mensuelle du chiffre d&apos;affaires</h2>

            <div className="flex gap-2 mb-6">
              {[6, 12, 24].map(m => (
                <Link key={m} href={`/admin/finance?view=evolution&months=${m}`}
                  className={`py-2 px-4 rounded-2xl text-sm font-bold transition-all ${monthsCount === m
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {m} mois
                </Link>
              ))}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-end gap-2 h-64 overflow-x-auto pb-2">
                {months.map((m, i) => {
                  const heightPct = Math.round((m.total / maxMonthCA) * 100);
                  const isCurrent = i === months.length - 1;
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 min-w-[40px] h-full justify-end">
                      <span className="text-xs font-bold text-gray-600 mb-1">{m.total > 0 ? m.total.toLocaleString('fr-FR') : ''}</span>
                      <div
                        className={`w-full rounded-t-xl transition-all ${m.total === 0
                          ? 'bg-gray-100 h-2'
                          : isCurrent
                            ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                            : 'bg-gradient-to-t from-blue-500 to-blue-400'}`}
                        style={{ height: m.total === 0 ? '8px' : `${Math.max(heightPct, 10)}%` }}
                        title={`${m.label} ${m.year} : ${m.total.toLocaleString('fr-FR')} FCFA (${m.count} souscription${m.count > 1 ? 's' : ''})`}
                      ></div>
                      <span className="text-xs text-gray-400 mt-2 font-bold">{m.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
                <span className="font-bold text-gray-500">Total période : <span className="text-emerald-600">{fmt(months.reduce((s, m) => s + m.total, 0))}</span></span>
                <span className="font-bold text-gray-500">Souscriptions : {months.reduce((s, m) => s + m.count, 0)}</span>
                <span className="font-bold text-gray-500">Moyenne mensuelle : {fmt(Math.round(months.reduce((s, m) => s + m.total, 0) / months.length))}</span>
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* VUE : NIVEAUX                                      */}
        {/* ================================================== */}
        {view === 'niveaux' && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">👑 Analyse par niveau Premium</h2>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contribution au CA total (historique)</p>
              {tierData.map(t => (
                <div key={t.tier} className="mb-4">
                  <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                    <span>{t.name} · {t.priceLabel}/mois</span>
                    <span>{fmt(t.revTotal)} · {t.contribution}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="h-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all" style={{ width: `${t.contribution}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tierData.map(t => (
                <div key={t.tier} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{t.tier === 1 ? '💠' : t.tier === 2 ? '💎' : '👑'}</span>
                    <h3 className="font-extrabold text-gray-800">{t.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between"><span className="text-gray-400">Abonnés actifs</span><span className="font-bold text-gray-700">{t.activeCount}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Souscriptions totales</span><span className="font-bold text-gray-700">{t.subsTotal}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Souscriptions ce mois</span><span className="font-bold text-blue-600">{t.subsMonth}</span></p>
                    <p className="flex justify-between border-t pt-2"><span className="text-gray-400">Revenus ce mois</span><span className="font-bold text-emerald-600">{fmt(t.revMonth)}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Revenus cette année</span><span className="font-bold text-emerald-600">{fmt(t.revYear)}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Revenus cumulés</span><span className="font-extrabold text-emerald-700">{fmt(t.revTotal)}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* VUE : MÉTHODES                                     */}
        {/* ================================================== */}
        {view === 'methodes' && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">💳 Analyse par méthode de paiement</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {methodData.map(({ method, txCount, revTotal, revMonth, share }) => (
                <div key={method.id} className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 ${method.isManual ? '' : 'opacity-75'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{method.icon || '💰'}</span>
                      <h3 className="font-extrabold text-gray-800">{method.name}</h3>
                    </div>
                    {!method.isManual && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold uppercase">Automatisée</span>}
                    {method.isActive ? (
                      <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full font-bold">✅ Active</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full font-bold">⚪ Désactivée</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between"><span className="text-gray-400">Transactions</span><span className="font-bold text-gray-700">{txCount}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Encaissé ce mois</span><span className="font-bold text-emerald-600">{fmt(revMonth)}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Encaissé (total)</span><span className="font-extrabold text-emerald-700">{fmt(revTotal)}</span></p>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                      <span>Part du CA</span>
                      <span>{share}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${share}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}

              {noMethodCount > 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 opacity-75">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">❓</span>
                    <h3 className="font-extrabold text-gray-800">Non renseignée</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between"><span className="text-gray-400">Transactions (ancien système)</span><span className="font-bold text-gray-700">{noMethodCount}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Encaissé</span><span className="font-bold text-emerald-600">{fmt(noMethodRev)}</span></p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* VUE : RENOUVELLEMENTS                              */}
        {/* ================================================== */}
        {view === 'renouvellements' && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">🔄 Renouvellements &amp; attrition (indicatif)</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {kpiCard('Payants uniques (historique)', `${payersCount}`, 'text-blue-600')}
              {kpiCard('Ont renouvelé ≥ 1 fois', `${repeatPayers}`, 'text-emerald-600')}
              {kpiCard('N\'ont renouvelé aucune fois', `${oneTimePayers}`, 'text-orange-500')}
              {kpiCard('Taux d\'attrition (indicatif)', `${churnRate} %`, churnRate < 50 ? 'text-emerald-600' : 'text-red-600', 'Payants n\'ayant jamais renouvelé / payants')}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Répartition des payants</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                    <span>🟢 Ont renouvelé au moins une fois</span>
                    <span>{repeatPayers} · {payersCount > 0 ? Math.round((repeatPayers / payersCount) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="h-4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${payersCount > 0 ? (repeatPayers / payersCount) * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                    <span>🟠 N&apos;ont jamais renouvelé</span>
                    <span>{oneTimePayers} · {payersCount > 0 ? Math.round((oneTimePayers / payersCount) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="h-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: `${payersCount > 0 ? (oneTimePayers / payersCount) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                <p>⚠️ Indicateurs <b>indicatifs</b> : l&apos;historique d&apos;abonnement est jeune et certains utilisateurs encore actifs n&apos;ont pas encore eu l&apos;occasion de renouveler.</p>
                <p>Abonnés actifs : <b>{activePremium}</b> · Renouvellements cumulés : <b>{renewalsTotal}</b> · Expirés non purgés : <b>{expiredCount}</b></p>
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* VUE : DÉPENSES (F3)                                */}
        {/* ================================================== */}
        {view === 'depenses' && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">💸 Dépenses</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {kpiCard('Dépenses ce mois', fmt(expensesMonth), 'text-red-500')}
              {kpiCard('Dépenses cette année', fmt(expensesYear), 'text-red-500')}
              {kpiCard('Dépenses cumulées', fmt(expensesTotal), 'text-red-600')}
            </div>

            {expensesByCategory.length > 0 && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Répartition par catégorie</p>
                <div className="space-y-3">
                  {expensesByCategory.map(c => (
                    <div key={c.value}>
                      <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                        <span>{c.label}</span>
                        <span>{fmt(c.total)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="h-3 rounded-full bg-gradient-to-r from-red-400 to-red-500" style={{ width: `${Math.round((c.total / maxCategoryExpense) * 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ExpenseManager expenses={expensesList} />
          </section>
        )}

        {/* ================================================== */}
        {/* VUE : TRÉSORERIE (F3)                              */}
        {/* ================================================== */}
        {view === 'tresorerie' && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">💧 Flux de trésorerie</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {treso.map(p => (
                <div key={p.label} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{p.label}</p>
                  <p className="text-sm flex justify-between"><span className="text-gray-400">Entrées</span><span className="font-bold text-emerald-600">+{fmt(p.entrees)}</span></p>
                  <p className="text-sm flex justify-between"><span className="text-gray-400">Sorties</span><span className="font-bold text-red-500">-{fmt(p.sorties)}</span></p>
                  <p className="text-sm flex justify-between border-t border-gray-100 mt-2 pt-2">
                    <span className="text-gray-500 font-bold">Solde</span>
                    <span className={`font-extrabold ${p.solde >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{p.solde >= 0 ? '+' : ''}{fmt(p.solde)}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Détail mensuel ({monthsCount} derniers mois)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                      <th className="py-2 pr-4">Mois</th>
                      <th className="py-2 pr-4 text-right">Entrées</th>
                      <th className="py-2 pr-4 text-right">Sorties</th>
                      <th className="py-2 text-right">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashMonths.map((m, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 font-bold text-gray-600">{m.label} {m.year}</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-emerald-600">{m.total > 0 ? `+${m.total.toLocaleString('fr-FR')}` : '—'}</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-red-500">{m.expenses > 0 ? `-${m.expenses.toLocaleString('fr-FR')}` : '—'}</td>
                        <td className={`py-2.5 text-right font-extrabold ${m.solde >= 0 ? 'text-gray-600' : 'text-red-600'}`}>{(m.total > 0 || m.expenses > 0) ? m.solde.toLocaleString('fr-FR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-4">⚠️ Sorties = dépenses enregistrées uniquement (commissions ambassadeurs non implémentées). Entrées = paiements Premium validés.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}