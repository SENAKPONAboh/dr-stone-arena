import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { PREMIUM_PLANS, getPlanLabel } from '@/lib/premium';
import { PASS_PRICE_FCFA, UA_PER_FCFA } from '@/lib/monetise';
import ExpenseManager from '@/components/admin/finance/ExpenseManager';
import GoalManager from '@/components/admin/finance/GoalManager';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';
import { GOAL_TYPES } from '@/lib/goal-types';
import { ALERT_THRESHOLDS, FinanceAlert } from '@/lib/finance-alerts';
import { periodStarts, localMidnight, localParts, monthKeyOf } from '@/lib/finance-time';
import AdminHeader, { Stat, SectionTitle } from '@/components/admin/ui/AdminHeader';
import AdminIcon from '@/components/admin/ui/AdminIcon';

// ===== CENTRE FINANCIER =====
// Lecture seule. Toutes les entrées d'argent réel (Premium, Pass Élite, recharges UA)
// et toutes les sorties (dépenses, versements ambassadeurs, Primes Arena payées).

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 25;

type View = 'resume' | 'mois' | 'transactions' | 'depenses' | 'ambassadeurs';
const VIEWS: { key: View; label: string }[] = [
  { key: 'resume', label: 'Résumé' },
  { key: 'mois', label: 'Mois par mois' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'depenses', label: 'Dépenses' },
  { key: 'ambassadeurs', label: 'Ambassadeurs' },
];

type Source = 'PREMIUM' | 'PASS' | 'RECHARGE';
const SOURCE_LABEL: Record<Source, string> = { PREMIUM: 'Premium', PASS: 'Pass Élite', RECHARGE: 'Recharges UA' };
type Money = { amount: number; at: Date };
type Entry = Money & { source: Source; methodId: string | null };

type Kind = Source | 'PRIME';
const KIND_LABEL: Record<Kind, string> = { PREMIUM: 'Premium', PASS: 'Pass Élite', RECHARGE: 'Recharge UA', PRIME: 'Prime Arena' };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ view?: string; months?: string; kind?: string; status?: string; period?: string; page?: string }> }) {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  const sp = await searchParams;
  const view: View = VIEWS.some(v => v.key === sp.view) ? (sp.view as View) : 'resume';
  const monthsCount = [6, 12, 24].includes(parseInt(sp.months || '')) ? parseInt(sp.months!) : 12;

  const now = new Date();
  const P = periodStarts(now);

  // ===== Données (lecture seule) =====
  const [
    premiumOk, passOk, rechargeOk, primesPaid, payouts, expensesList, paymentMethods, financialGoals,
    commissions, ambassadors, activeByTier, passActive, totalStudents, uaAgg,
    pendingPremium, pendingPass, pendingRecharge, pendingPrimes, refundedCount, premiumByUser,
  ] = await Promise.all([
    prisma.premiumRequest.findMany({ where: { status: 'VALIDE', amount: { not: null } }, select: { amount: true, validatedAt: true, createdAt: true, paymentMethodId: true, tier: true } }),
    prisma.passRequest.findMany({ where: { status: 'VALIDE' }, select: { validatedAt: true, createdAt: true, paymentMethodId: true } }),
    prisma.rechargeRequest.findMany({ where: { status: 'VALIDE' }, select: { amountFCFA: true, validatedAt: true, createdAt: true, paymentMethodId: true } }),
    prisma.withdrawalRequest.findMany({ where: { status: 'PAYE' }, select: { amountFCFA: true, processedAt: true, createdAt: true } }),
    prisma.ambassadorPayout.findMany({ select: { amount: true, paidAt: true } }),
    prisma.expense.findMany({ orderBy: { spentAt: 'desc' }, select: { id: true, amount: true, category: true, description: true, vendor: true, spentAt: true } }),
    prisma.paymentMethod.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.financialGoal.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.ambassadorCommission.findMany({ select: { ambassadorId: true, amount: true, status: true, premiumRequest: { select: { amount: true } } } }),
    prisma.ambassador.findMany({ select: { id: true, referralCode: true, status: true, user: { select: { prenom: true, nom: true, pseudo: true } } } }),
    prisma.user.groupBy({ by: ['premiumTier'], where: { role: 'ETUDIANT', isPremium: true, premiumExpiresAt: { gt: now }, premiumTier: { not: null } }, _count: { _all: true } }),
    prisma.user.count({ where: { role: 'ETUDIANT', passActive: true, passExpiresAt: { gt: now } } }),
    prisma.user.count({ where: { role: 'ETUDIANT' } }),
    prisma.user.aggregate({ where: { role: 'ETUDIANT' }, _sum: { uaBalance: true, uaRecharged: true } }),
    prisma.premiumRequest.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.passRequest.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.rechargeRequest.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.withdrawalRequest.findMany({ where: { status: { in: ['EN_ATTENTE', 'EN_TRAITEMENT'] } }, select: { amountFCFA: true } }),
    prisma.premiumRequest.count({ where: { status: 'REMBOURSE' } }),
    prisma.premiumRequest.groupBy({ by: ['userId'], where: { status: 'VALIDE' }, _count: { _all: true } }),
  ]);

  // ===== Entrées et sorties =====
  const entries: Entry[] = [
    ...premiumOk.map(t => ({ source: 'PREMIUM' as const, amount: t.amount ?? 0, at: t.validatedAt ?? t.createdAt, methodId: t.paymentMethodId })),
    ...passOk.map(t => ({ source: 'PASS' as const, amount: PASS_PRICE_FCFA, at: t.validatedAt ?? t.createdAt, methodId: t.paymentMethodId })),
    ...rechargeOk.map(t => ({ source: 'RECHARGE' as const, amount: t.amountFCFA, at: t.validatedAt ?? t.createdAt, methodId: t.paymentMethodId })),
  ];
  const outExpenses: Money[] = expensesList.map(e => ({ amount: e.amount, at: e.spentAt }));
  const outPayouts: Money[] = payouts.map(p => ({ amount: p.amount, at: p.paidAt }));
  const outPrimes: Money[] = primesPaid.map(w => ({ amount: w.amountFCFA, at: w.processedAt ?? w.createdAt }));

  const sum = (list: Money[], from?: Date, to?: Date) =>
    list.filter(x => (!from || x.at >= from) && (!to || x.at < to)).reduce((s, x) => s + x.amount, 0);
  const inFrom = (from?: Date, to?: Date, source?: Source) => sum(source ? entries.filter(e => e.source === source) : entries, from, to);
  const outFrom = (from?: Date, to?: Date) => sum(outExpenses, from, to) + sum(outPayouts, from, to) + sum(outPrimes, from, to);

  const inMonth = inFrom(P.month);
  const inPrevMonth = inFrom(P.prevMonth, P.month);
  const outMonth = outFrom(P.month);
  const inTotal = inFrom();
  const outTotal = outFrom();
  const variationPct = inPrevMonth > 0 ? Math.round(((inMonth - inPrevMonth) / inPrevMonth) * 100) : null;

  // ===== Ce qu'il reste à payer =====
  const primesPendingFCFA = pendingPrimes.reduce((s, w) => s + w.amountFCFA, 0);
  const commissionsPending = commissions.filter(c => c.status === 'EN_ATTENTE').reduce((s, c) => s + c.amount, 0);
  // UA gagnées (hors recharges, jamais retirables) que les étudiants pourraient demander en Prime
  const earnedUA = Math.max(0, (uaAgg._sum.uaBalance ?? 0) - (uaAgg._sum.uaRecharged ?? 0));
  const potentialPrimesFCFA = Math.floor(earnedUA / UA_PER_FCFA);

  // ===== Abonnés =====
  const priceByTier: Record<number, number> = {};
  for (const p of PREMIUM_PLANS) priceByTier[p.tier] = p.price;
  const activeByTierMap: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let activePremium = 0;
  let premiumMonthly = 0;
  for (const g of activeByTier) {
    const tier = g.premiumTier ?? 0;
    activePremium += g._count._all;
    if (activeByTierMap[tier] !== undefined) activeByTierMap[tier] = g._count._all;
    premiumMonthly += g._count._all * (priceByTier[tier] || 0);
  }
  const recurringMonthly = premiumMonthly + passActive * PASS_PRICE_FCFA;
  const conversionPct = totalStudents > 0 ? Math.round((activePremium / totalStudents) * 100) : 0;
  const newPremiumMonth = entries.filter(e => e.source === 'PREMIUM' && e.at >= P.month).length;
  const newPassMonth = entries.filter(e => e.source === 'PASS' && e.at >= P.month).length;
  const repeatPayers = premiumByUser.filter(g => g._count._all >= 2).length;

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
  const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('fr-FR') + ' FCFA';

  // ===== Mois par mois =====
  const nowParts = localParts(now);
  const months = Array.from({ length: monthsCount }, (_, i) => {
    const start = localMidnight(nowParts.y, nowParts.m - (monthsCount - 1 - i), 1);
    const p = localParts(start);
    return { key: monthKeyOf(start), label: start.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', ''), year: p.y, PREMIUM: 0, PASS: 0, RECHARGE: 0, out: 0 };
  });
  const monthIdx = new Map(months.map((m, i) => [m.key, i]));
  for (const e of entries) { const i = monthIdx.get(monthKeyOf(e.at)); if (i !== undefined) months[i][e.source] += e.amount; }
  for (const o of [...outExpenses, ...outPayouts, ...outPrimes]) { const i = monthIdx.get(monthKeyOf(o.at)); if (i !== undefined) months[i].out += o.amount; }
  const monthRows = months.map(m => ({ ...m, in: m.PREMIUM + m.PASS + m.RECHARGE }));
  const maxBar = Math.max(1, ...monthRows.map(m => Math.max(m.in, m.out)));

  // ===== Par moyen de paiement (toutes les entrées) =====
  const byMethod = new Map<string, number>();
  for (const e of entries) byMethod.set(e.methodId ?? '', (byMethod.get(e.methodId ?? '') ?? 0) + e.amount);
  const methodRows = [
    ...paymentMethods.map(m => ({ id: m.id, name: m.name, active: m.isActive, total: byMethod.get(m.id) ?? 0 })),
    ...(byMethod.get('') ? [{ id: 'none', name: 'Non précisé (anciens paiements)', active: true, total: byMethod.get('')! }] : []),
  ].filter(m => m.total > 0 || m.active).sort((a, b) => b.total - a.total);

  // ===== Objectifs =====
  const goalsWithProgress = financialGoals.map(g => {
    const isMonthly = /^\d{4}-\d{2}$/.test(g.period);
    const isCurrent = isMonthly ? g.period === P.monthKey : g.period === P.yearKey;
    const from = isMonthly ? P.month : P.year;
    let current: number | null = null;
    if (isCurrent) {
      switch (g.type) {
        case 'CA': current = inFrom(from); break;
        case 'PREMIUM_ACTIFS': current = activePremium; break;
        case 'MRR': current = recurringMonthly; break;
        case 'RESULTAT_ESTIME': current = inFrom(from) - outFrom(from); break;
      }
    }
    const progressPct = current !== null && g.target > 0 ? Math.min(100, Math.round((current / g.target) * 100)) : null;
    return { id: g.id, type: g.type, target: g.target, period: g.period, current, progressPct };
  });

  // ===== Alertes (avec le lien pour agir) =====
  const alerts: FinanceAlert[] = [];
  if (paymentMethods.filter(m => m.isActive).length === 0) {
    alerts.push({ level: 'danger', title: 'Aucun moyen de paiement actif', message: "Les étudiants ne peuvent plus payer. Active au moins un moyen de paiement.", href: '/admin/payment-methods' });
  }
  if (pendingPrimes.length > 0) {
    alerts.push({ level: 'warning', title: `${pendingPrimes.length} Prime${pendingPrimes.length > 1 ? 's' : ''} Arena à payer (${fmt(primesPendingFCFA)})`, message: 'Envoie le mobile money puis clique « Marquer payé ».', href: '/admin/ua' });
  }
  const pendingIn = pendingPremium + pendingPass + pendingRecharge;
  if (pendingIn > 0) {
    const parts = [pendingPremium && `${pendingPremium} Premium`, pendingPass && `${pendingPass} Pass`, pendingRecharge && `${pendingRecharge} recharge${pendingRecharge > 1 ? 's' : ''}`].filter(Boolean).join(', ');
    alerts.push({ level: pendingIn > ALERT_THRESHOLDS.PENDING_REQUESTS_WARNING ? 'warning' : 'info', title: `${pendingIn} reçu${pendingIn > 1 ? 's' : ''} à vérifier`, message: parts + '.', href: pendingPremium ? '/admin/premium' : pendingPass ? '/admin/monetise' : '/admin/ua' });
  }
  if (outMonth > 0 && outMonth > inMonth) {
    alerts.push({ level: 'danger', title: 'Plus de sorties que d’entrées ce mois', message: `Sorties ${fmt(outMonth)} pour ${fmt(inMonth)} encaissés.` });
  } else if (inMonth > 0 && outMonth > (inMonth * ALERT_THRESHOLDS.EXPENSES_RATIO_WARNING) / 100) {
    alerts.push({ level: 'warning', title: 'Sorties élevées ce mois', message: `Les sorties représentent ${Math.round((outMonth / inMonth) * 100)} % des entrées du mois.` });
  }
  if (inPrevMonth > 0 && P.dayOfMonth >= 20) {
    const drop = Math.round(((inPrevMonth - inMonth) / inPrevMonth) * 100);
    if (drop >= ALERT_THRESHOLDS.CA_DROP_WARNING) alerts.push({ level: 'warning', title: `Entrées en baisse (−${drop} %)`, message: `${fmt(inMonth)} ce mois contre ${fmt(inPrevMonth)} le mois dernier.` });
  }
  const expectedProgress = Math.round((P.dayOfMonth / P.daysInMonth) * 100);
  if (expectedProgress >= 20) {
    for (const g of goalsWithProgress) {
      if (g.progressPct === null) continue;
      if (g.progressPct < Math.round((expectedProgress * ALERT_THRESHOLDS.GOAL_PROGRESS_RATIO) / 100)) {
        const label = GOAL_TYPES.find(t => t.value === g.type)?.label ?? g.type;
        alerts.push({ level: 'warning', title: 'Objectif en retard', message: `${label} (${g.period}) : ${g.progressPct} % atteint, ${expectedProgress} % du mois écoulé.` });
      }
    }
  }
  if (commissionsPending > 0) {
    alerts.push({ level: 'info', title: `${fmt(commissionsPending)} de commissions à verser`, message: 'Bouton « Verser » sur la page Ambassadeurs.', href: '/admin/ambassadors' });
  }
  if (refundedCount > 0) {
    alerts.push({ level: 'info', title: `${refundedCount} paiement${refundedCount > 1 ? 's' : ''} remboursé${refundedCount > 1 ? 's' : ''}`, message: 'Vérifie que c’est voulu.' });
  }
  const levelOrder = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  const dangerCount = alerts.filter(a => a.level === 'danger').length;

  // ===== Transactions (toutes sources, seulement si l'onglet est ouvert) =====
  const fKind: Kind | '' = ['PREMIUM', 'PASS', 'RECHARGE', 'PRIME'].includes(sp.kind || '') ? (sp.kind as Kind) : '';
  const fStatus = ['attente', 'ok', 'non'].includes(sp.status || '') ? sp.status! : '';
  const fPeriod = ['7j', '30j', '90j'].includes(sp.period || '') ? sp.period! : '';
  const fPage = Math.max(1, parseInt(sp.page || '1') || 1);
  const STATUS_GROUP: Record<string, string[]> = { attente: ['EN_ATTENTE', 'EN_TRAITEMENT'], ok: ['VALIDE', 'PAYE'], non: ['REJETE', 'ANNULE', 'REMBOURSE'] };

  type TxRow = { id: string; kind: Kind; createdAt: Date; doneAt: Date | null; name: string; email: string; detail: string; amount: number | null; method: string | null; status: string };
  let tx: { rows: TxRow[]; total: number; inSum: number; outSum: number } | null = null;
  if (view === 'transactions') {
    const where: any = {};
    if (fStatus) where.status = { in: STATUS_GROUP[fStatus] };
    if (fPeriod) where.createdAt = { gte: new Date(now.getTime() - parseInt(fPeriod) * DAY_MS) };
    const take = 1000;
    const userSel = { select: { prenom: true, nom: true, pseudo: true, email: true } };
    const methodSel = { select: { name: true } };
    const want = (k: Kind) => !fKind || fKind === k;
    const [pr, pa, rc, wd] = await Promise.all([
      want('PREMIUM') ? prisma.premiumRequest.findMany({ where, take, orderBy: { createdAt: 'desc' }, select: { id: true, tier: true, amount: true, status: true, createdAt: true, validatedAt: true, user: userSel, paymentMethod: methodSel } }) : [],
      want('PASS') ? prisma.passRequest.findMany({ where, take, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, createdAt: true, validatedAt: true, user: userSel, paymentMethod: methodSel } }) : [],
      want('RECHARGE') ? prisma.rechargeRequest.findMany({ where, take, orderBy: { createdAt: 'desc' }, select: { id: true, amountFCFA: true, amountUA: true, status: true, createdAt: true, validatedAt: true, user: userSel, paymentMethod: methodSel } }) : [],
      want('PRIME') ? prisma.withdrawalRequest.findMany({ where, take, orderBy: { createdAt: 'desc' }, select: { id: true, amountFCFA: true, operator: true, phoneNumber: true, status: true, createdAt: true, processedAt: true, user: userSel } }) : [],
    ]);
    const who = (u: { prenom: string; nom: string; pseudo: string | null; email: string }) => ({ name: u.pseudo || `${u.prenom} ${u.nom}`, email: u.email });
    const all: TxRow[] = [
      ...pr.map(r => ({ id: r.id, kind: 'PREMIUM' as const, createdAt: r.createdAt, doneAt: r.validatedAt, ...who(r.user), detail: r.tier ? getPlanLabel(r.tier) : 'Premium', amount: r.amount, method: r.paymentMethod?.name ?? null, status: r.status })),
      ...pa.map(r => ({ id: r.id, kind: 'PASS' as const, createdAt: r.createdAt, doneAt: r.validatedAt, ...who(r.user), detail: '30 jours', amount: PASS_PRICE_FCFA, method: r.paymentMethod?.name ?? null, status: r.status })),
      ...rc.map(r => ({ id: r.id, kind: 'RECHARGE' as const, createdAt: r.createdAt, doneAt: r.validatedAt, ...who(r.user), detail: `${r.amountUA.toLocaleString('fr-FR')} UA`, amount: r.amountFCFA, method: r.paymentMethod?.name ?? null, status: r.status })),
      ...wd.map(r => ({ id: r.id, kind: 'PRIME' as const, createdAt: r.createdAt, doneAt: r.processedAt, ...who(r.user), detail: r.phoneNumber, amount: r.amountFCFA, method: r.operator === 'ORANGE_MONEY' ? 'Orange Money' : r.operator === 'MOOV_MONEY' ? 'Moov Money' : r.operator, status: r.status })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const done = all.filter(r => r.status === 'VALIDE' || r.status === 'PAYE');
    tx = {
      rows: all.slice((fPage - 1) * PAGE_SIZE, fPage * PAGE_SIZE),
      total: all.length,
      inSum: done.filter(r => r.kind !== 'PRIME').reduce((s, r) => s + (r.amount ?? 0), 0),
      outSum: done.filter(r => r.kind === 'PRIME').reduce((s, r) => s + (r.amount ?? 0), 0),
    };
  }
  const totalPages = tx ? Math.max(1, Math.ceil(tx.total / PAGE_SIZE)) : 1;
  const txUrl = (o: Record<string, string | null>) => {
    const params = new URLSearchParams({ view: 'transactions' });
    const base: Record<string, string> = { ...(fKind ? { kind: fKind } : {}), ...(fStatus ? { status: fStatus } : {}), ...(fPeriod ? { period: fPeriod } : {}), ...(fPage > 1 ? { page: String(fPage) } : {}) };
    for (const [k, v] of Object.entries({ ...base, ...o })) { if (v) params.set(k, v); else params.delete(k); }
    return `/admin/finance?${params.toString()}`;
  };
  const statusBadge = (s: string) => {
    if (s === 'VALIDE' || s === 'PAYE') return <span className="adm-badge adm-badge-mala">{s === 'PAYE' ? 'Payée' : 'Validée'}</span>;
    if (s === 'EN_ATTENTE') return <span className="adm-badge adm-badge-gold">En attente</span>;
    if (s === 'EN_TRAITEMENT') return <span className="adm-badge adm-badge-sky">En traitement</span>;
    if (s === 'REMBOURSE') return <span className="adm-badge adm-badge-mute">Remboursée</span>;
    if (s === 'ANNULE') return <span className="adm-badge adm-badge-mute">Annulée</span>;
    return <span className="adm-badge adm-badge-heart">Rejetée</span>;
  };

  // ===== Dépenses =====
  const expByCat = EXPENSE_CATEGORIES
    .map(c => ({ ...c, total: expensesList.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0) }))
    .filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...expByCat.map(c => c.total));

  // ===== Ambassadeurs =====
  const ambassadorCa = commissions.reduce((s, c) => s + (c.premiumRequest?.amount ?? 0), 0);
  const commissionsDue = commissions.filter(c => c.status !== 'ANNULEE').reduce((s, c) => s + c.amount, 0);
  const payoutsTotal = payouts.reduce((s, p) => s + p.amount, 0);
  const comByAmb = new Map<string, { ca: number; due: number; pending: number }>();
  for (const c of commissions) {
    const acc = comByAmb.get(c.ambassadorId) ?? { ca: 0, due: 0, pending: 0 };
    acc.ca += c.premiumRequest?.amount ?? 0;
    if (c.status !== 'ANNULEE') acc.due += c.amount;
    if (c.status === 'EN_ATTENTE') acc.pending += c.amount;
    comByAmb.set(c.ambassadorId, acc);
  }
  const topAmb = ambassadors
    .map(a => ({ ...a, name: a.user.pseudo || `${a.user.prenom} ${a.user.nom}`, stats: comByAmb.get(a.id) ?? { ca: 0, due: 0, pending: 0 } }))
    .sort((x, y) => y.stats.ca - x.stats.ca);

  const tabHref = (v: View) => `/admin/finance${v !== 'resume' ? `?view=${v}` : ''}`;
  const alertTone = { danger: 'border-heart/40 bg-heart/10 text-heart', warning: 'border-flame/40 bg-flame/10 text-flame', info: 'border-sky/30 bg-sky/10 text-sky' };

  return (
    <div className="min-h-screen pb-12">
      <AdminHeader title="Centre financier" subtitle="Tout l'argent qui entre et qui sort" icon="chart" tone="gold" />

      <main className="mx-auto mt-5 max-w-6xl space-y-6 px-4">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {VIEWS.map(v => (
            <Link key={v.key} href={tabHref(v.key)} className={`adm-tab ${view === v.key ? 'adm-tab-on' : ''}`}>
              {v.label}
              {v.key === 'resume' && dangerCount > 0 && <span className="adm-dot">{dangerCount}</span>}
            </Link>
          ))}
        </nav>

        {/* ================= RÉSUMÉ ================= */}
        {view === 'resume' && (
          <>
            {alerts.length > 0 && (
              <section className="adm-rise space-y-2">
                {alerts.map((a, i) => {
                  const body = (
                    <div className={`flex items-start gap-3 rounded-2xl border p-3 ${alertTone[a.level]}`}>
                      <AdminIcon name={a.level === 'info' ? 'clock' : 'alert'} className="mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold">{a.title}</p>
                        <p className="text-xs text-mute">{a.message}</p>
                      </div>
                      {a.href && <span className="self-center text-xs font-extrabold">Ouvrir →</span>}
                    </div>
                  );
                  return a.href ? <Link key={i} href={a.href} className="adm-link-card block">{body}</Link> : <div key={i}>{body}</div>;
                })}
              </section>
            )}

            <section className="adm-rise">
              <SectionTitle icon="arrowDown">Argent encaissé</SectionTitle>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Aujourd'hui" value={fmt(inFrom(P.day))} tone="mala" />
                <Stat label="Cette semaine" value={fmt(inFrom(P.week))} tone="mala" />
                <Stat label="Ce mois" value={fmt(inMonth)} tone="mala"
                  sub={variationPct === null ? 'Premier mois comparable' : <span className={variationPct >= 0 ? 'text-mala' : 'text-heart'}>{variationPct >= 0 ? '▲' : '▼'} {Math.abs(variationPct)} % vs mois dernier</span>} />
                <Stat label="Depuis le lancement" value={fmt(inTotal)} tone="mala" />
              </div>
              <div className="adm-card mt-3 p-4">
                <p className="adm-label mb-3">D'où vient l'argent (ce mois · total)</p>
                <div className="space-y-3">
                  {(Object.keys(SOURCE_LABEL) as Source[]).map(s => {
                    const total = inFrom(undefined, undefined, s);
                    const pct = inTotal > 0 ? Math.round((total / inTotal) * 100) : 0;
                    return (
                      <div key={s}>
                        <div className="mb-1 flex justify-between gap-2 text-sm">
                          <span className="font-bold text-ink">{SOURCE_LABEL[s]}</span>
                          <span className="adm-num text-xs text-mute">{fmt(inFrom(P.month, undefined, s))} · {fmt(total)}</span>
                        </div>
                        <div className="adm-track"><div className={`adm-fill ${s === 'PASS' ? 'bg-gold' : s === 'RECHARGE' ? 'bg-sky' : 'bg-mala'}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="adm-rise grid gap-3 md:grid-cols-2">
              <div className="adm-card p-4">
                <SectionTitle icon="arrowUp">Argent sorti</SectionTitle>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Dépenses', sum(outExpenses, P.month), sum(outExpenses)],
                    ['Versements ambassadeurs', sum(outPayouts, P.month), sum(outPayouts)],
                    ['Primes Arena payées', sum(outPrimes, P.month), sum(outPrimes)],
                  ].map(([l, m, t]) => (
                    <div key={l as string} className="flex justify-between gap-2"><dt className="text-mute">{l}</dt><dd className="adm-num text-right text-xs text-ink">{fmt(m as number)} <span className="text-mute">· {fmt(t as number)}</span></dd></div>
                  ))}
                  <div className="flex justify-between gap-2 border-t border-line pt-2 font-bold"><dt>Total (mois · total)</dt><dd className="adm-num text-right text-xs text-heart">{fmt(outMonth)} · {fmt(outTotal)}</dd></div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="adm-card-2 p-3"><p className="adm-label">Solde du mois</p><p className={`adm-num mt-1 ${inMonth - outMonth >= 0 ? 'text-mala' : 'text-heart'}`}>{signed(inMonth - outMonth)}</p></div>
                  <div className="adm-card-2 p-3"><p className="adm-label">Solde total</p><p className={`adm-num mt-1 ${inTotal - outTotal >= 0 ? 'text-mala' : 'text-heart'}`}>{signed(inTotal - outTotal)}</p></div>
                </div>
              </div>

              <div className="adm-card p-4">
                <SectionTitle icon="clock">Ce que tu dois encore payer</SectionTitle>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-mute">Primes Arena demandées ({pendingPrimes.length})</dt><dd className="adm-num text-xs text-flame">{fmt(primesPendingFCFA)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-mute">Commissions ambassadeurs</dt><dd className="adm-num text-xs text-flame">{fmt(commissionsPending)}</dd></div>
                  <div className="flex justify-between gap-2 border-t border-line pt-2 font-bold"><dt>À payer maintenant</dt><dd className="adm-num text-xs text-flame">{fmt(primesPendingFCFA + commissionsPending)}</dd></div>
                </dl>
                <div className="adm-card-2 mt-4 p-3">
                  <p className="adm-label">Primes possibles plus tard</p>
                  <p className="adm-num mt-1 text-gold">{fmt(potentialPrimesFCFA)}</p>
                  <p className="mt-1 text-xs text-mute">UA gagnées par les étudiants ({earnedUA.toLocaleString('fr-FR')} UA), hors recharges. Ce n'est dû que s'ils demandent un retrait.</p>
                </div>
              </div>
            </section>

            <section className="adm-rise">
              <SectionTitle icon="crown">Abonnés</SectionTitle>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Premium actifs" value={activePremium} tone="sky" sub={`${conversionPct} % des ${totalStudents} inscrits`} />
                <Stat label="Pass Élite actifs" value={passActive} tone="gold" />
                <Stat label="Nouveaux ce mois" value={newPremiumMonth + newPassMonth} sub={`${newPremiumMonth} Premium · ${newPassMonth} Pass`} />
                <Stat label="Abonnements en cours" value={fmt(recurringMonthly)} tone="mala" sub="par mois, si tout le monde renouvelle" />
              </div>
              <div className="adm-card mt-3 p-4">
                <div className="space-y-3">
                  {PREMIUM_PLANS.map(p => {
                    const c = activeByTierMap[p.tier];
                    const pct = activePremium > 0 ? Math.round((c / activePremium) * 100) : 0;
                    return (
                      <div key={p.tier}>
                        <div className="mb-1 flex justify-between text-sm"><span className="font-bold">{p.name} <span className="text-mute">· {p.priceLabel}</span></span><span className="adm-num text-xs text-mute">{c}</span></div>
                        <div className="adm-track"><div className="adm-fill bg-sky" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-mute">{repeatPayers} étudiant{repeatPayers > 1 ? 's ont' : ' a'} déjà renouvelé leur Premium au moins une fois.</p>
              </div>
            </section>

            <section className="adm-rise">
              <SectionTitle icon="card">Par moyen de paiement (total encaissé)</SectionTitle>
              <div className="adm-card divide-y divide-line">
                {methodRows.length === 0 && <p className="p-4 text-sm text-mute">Aucun paiement pour l'instant.</p>}
                {methodRows.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <span className="font-bold">{m.name} {!m.active && <span className="adm-badge adm-badge-mute ml-1">désactivé</span>}</span>
                    <span className="adm-num text-xs">{fmt(m.total)} <span className="text-mute">· {inTotal > 0 ? Math.round((m.total / inTotal) * 100) : 0} %</span></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="adm-rise">
              <SectionTitle icon="target">Objectifs</SectionTitle>
              <GoalManager goals={goalsWithProgress} />
            </section>
          </>
        )}

        {/* ================= MOIS PAR MOIS ================= */}
        {view === 'mois' && (
          <section className="adm-rise space-y-4">
            <div className="flex gap-2">
              {[6, 12, 24].map(m => (
                <Link key={m} href={`/admin/finance?view=mois&months=${m}`} className={`adm-tab ${monthsCount === m ? 'adm-tab-on' : ''}`}>{m} mois</Link>
              ))}
            </div>
            <div className="adm-card p-4">
              <div className="mb-3 flex flex-wrap gap-4 text-xs font-bold text-mute">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mala" />Entrées</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-heart" />Sorties</span>
              </div>
              <div className="flex h-48 items-end gap-1.5 overflow-x-auto pb-1">
                {monthRows.map(m => (
                  <div key={m.key} className="flex h-full min-w-[28px] flex-1 flex-col items-center justify-end" title={`${m.label} ${m.year} : +${m.in.toLocaleString('fr-FR')} / −${m.out.toLocaleString('fr-FR')} FCFA`}>
                    <div className="flex h-full w-full items-end justify-center gap-0.5">
                      <div className="w-1/2 origin-bottom rounded-t bg-mala" style={{ height: `${Math.max(m.in ? 4 : 1, (m.in / maxBar) * 100)}%` }} />
                      <div className="w-1/2 origin-bottom rounded-t bg-heart/80" style={{ height: `${Math.max(m.out ? 4 : 1, (m.out / maxBar) * 100)}%` }} />
                    </div>
                    <span className="mt-1.5 text-[10px] font-bold text-mute">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="adm-card overflow-x-auto p-4">
              <table className="adm-table min-w-[560px]">
                <thead><tr><th>Mois</th><th className="text-right">Premium</th><th className="text-right">Pass</th><th className="text-right">Recharges</th><th className="text-right">Sorties</th><th className="text-right">Solde</th></tr></thead>
                <tbody>
                  {[...monthRows].reverse().map(m => (
                    <tr key={m.key}>
                      <td className="font-bold capitalize">{m.label} {m.year}</td>
                      {[m.PREMIUM, m.PASS, m.RECHARGE].map((v, i) => <td key={i} className="adm-num text-right text-xs">{v ? v.toLocaleString('fr-FR') : '—'}</td>)}
                      <td className="adm-num text-right text-xs text-heart">{m.out ? `−${m.out.toLocaleString('fr-FR')}` : '—'}</td>
                      <td className={`adm-num text-right text-xs ${m.in - m.out >= 0 ? 'text-mala' : 'text-heart'}`}>{m.in || m.out ? (m.in - m.out).toLocaleString('fr-FR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-mute">Montants en FCFA. Sorties = dépenses + versements ambassadeurs + Primes Arena payées.</p>
            </div>
          </section>
        )}

        {/* ================= TRANSACTIONS ================= */}
        {view === 'transactions' && tx && (
          <section className="adm-rise space-y-4">
            <div className="adm-card space-y-3 p-4">
              {[
                { key: 'kind', label: 'Type', cur: fKind, opts: [['', 'Tout'], ['PREMIUM', 'Premium'], ['PASS', 'Pass Élite'], ['RECHARGE', 'Recharges'], ['PRIME', 'Primes']] },
                { key: 'status', label: 'Statut', cur: fStatus, opts: [['', 'Tous'], ['attente', 'En attente'], ['ok', 'Réussies'], ['non', 'Rejetées']] },
                { key: 'period', label: 'Période', cur: fPeriod, opts: [['', 'Tout'], ['7j', '7 jours'], ['30j', '30 jours'], ['90j', '90 jours']] },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-2 overflow-x-auto">
                  <span className="adm-label w-16 flex-shrink-0">{f.label}</span>
                  {f.opts.map(([v, l]) => (
                    <Link key={v || 'all'} href={txUrl({ [f.key]: v || null, page: null })} className={`adm-tab ${f.cur === v ? 'adm-tab-on' : ''}`}>{l}</Link>
                  ))}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Lignes" value={tx.total} />
              <Stat label="Encaissé" value={fmt(tx.inSum)} tone="mala" />
              <Stat label="Primes payées" value={fmt(tx.outSum)} tone="heart" />
            </div>
            <div className="adm-card p-2 sm:p-4">
              {tx.rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-mute">Aucune transaction pour ce filtre.</p>
              ) : (
                <div className="divide-y divide-line">
                  {tx.rows.map(r => (
                    <div key={r.kind + r.id} className="flex items-start justify-between gap-3 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{r.name}</p>
                        <p className="truncate text-xs text-mute">{KIND_LABEL[r.kind]} · {r.detail}{r.method ? ` · ${r.method}` : ''}</p>
                        <p className="text-[11px] text-mute">{r.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}{r.doneAt ? ` · traitée le ${r.doneAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}` : ''}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <span className={`adm-num text-sm ${r.kind === 'PRIME' ? 'text-heart' : 'text-mala'}`}>{r.amount !== null ? `${r.kind === 'PRIME' ? '−' : '+'}${r.amount.toLocaleString('fr-FR')} F` : '—'}</span>
                        {statusBadge(r.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <Link href={txUrl({ page: fPage > 1 ? String(fPage - 1) : null })} className={`adm-btn adm-btn-ghost adm-btn-sm ${fPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>← Précédent</Link>
                  <span className="text-xs font-bold text-mute">Page {fPage} / {totalPages}</span>
                  <Link href={txUrl({ page: fPage < totalPages ? String(fPage + 1) : null })} className={`adm-btn adm-btn-ghost adm-btn-sm ${fPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>Suivant →</Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= DÉPENSES ================= */}
        {view === 'depenses' && (
          <section className="adm-rise space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Ce mois" value={fmt(sum(outExpenses, P.month))} tone="heart" />
              <Stat label="Cette année" value={fmt(sum(outExpenses, P.year))} tone="heart" />
              <Stat label="Total" value={fmt(sum(outExpenses))} tone="heart" />
            </div>
            {expByCat.length > 0 && (
              <div className="adm-card space-y-3 p-4">
                <p className="adm-label">Par catégorie</p>
                {expByCat.map(c => (
                  <div key={c.value}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-bold">{c.label}</span><span className="adm-num text-xs text-mute">{fmt(c.total)}</span></div>
                    <div className="adm-track"><div className="adm-fill bg-heart" style={{ width: `${Math.round((c.total / maxCat) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
            <ExpenseManager expenses={expensesList} />
          </section>
        )}

        {/* ================= AMBASSADEURS ================= */}
        {view === 'ambassadeurs' && (
          <section className="adm-rise space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Payé par leurs filleuls" value={fmt(ambassadorCa)} tone="mala" sub={`${inTotal > 0 ? Math.round((ambassadorCa / inTotal) * 100) : 0} % des entrées`} />
              <Stat label="Commissions gagnées" value={fmt(commissionsDue)} tone="gold" />
              <Stat label="Déjà versé" value={fmt(payoutsTotal)} tone="sky" />
              <Stat label="Reste à verser" value={fmt(commissionsPending)} tone="flame" />
            </div>
            <div className="adm-card p-2 sm:p-4">
              {topAmb.length === 0 ? (
                <p className="py-6 text-center text-sm text-mute">Aucun ambassadeur enregistré.</p>
              ) : (
                <div className="divide-y divide-line">
                  {topAmb.map((a, i) => (
                    <Link key={a.id} href={`/admin/ambassadors/${a.id}`} className="flex items-center gap-3 p-2.5 transition-colors hover:bg-slab-2">
                      <span className="adm-num w-6 text-center text-mute">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{a.name} <span className="text-mala">{a.referralCode}</span></p>
                        <p className="text-xs text-mute">{a.status === 'ACTIF' ? 'Actif' : a.status === 'SUSPENDU' ? 'Suspendu' : 'En attente'} · filleuls : {fmt(a.stats.ca)}</p>
                      </div>
                      <div className="text-right">
                        <p className="adm-num text-xs text-gold">{fmt(a.stats.due)}</p>
                        {a.stats.pending > 0 && <p className="text-[11px] font-bold text-flame">{fmt(a.stats.pending)} à verser</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <p className="mt-3 px-2 text-xs text-mute">Commission = un pourcentage de chaque Premium validé d'un filleul. Le versement se fait sur la page Ambassadeurs.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
