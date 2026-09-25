import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function AmbassadorDashboard() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true, commissionRate: true }
  });
  if (!ambassador || ambassador.status !== 'ACTIF') redirect('/etudiant');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, premiumActifs, commissions] = await Promise.all([
    prisma.user.count({ where: { referredById: ambassador.id } }),
    prisma.user.count({ where: { referredById: ambassador.id, isPremium: true, premiumExpiresAt: { gt: now } } }),
    prisma.ambassadorCommission.findMany({
      where: { ambassadorId: ambassador.id },
      orderBy: { createdAt: 'desc' },
      select: {
        amount: true, status: true, createdAt: true, userId: true,
        premiumRequest: { select: { amount: true, tier: true } }
      }
    }),
  ]);

  // ===== Calculs =====
  const caGenere = commissions.reduce((s, c) => s + (c.premiumRequest?.amount ?? 0), 0);
  const commissionCumulee = commissions.reduce((s, c) => s + c.amount, 0);
  const commissionMois = commissions.filter(c => c.createdAt >= startOfMonth).reduce((s, c) => s + c.amount, 0);
  const enAttente = commissions.filter(c => c.status === 'EN_ATTENTE').reduce((s, c) => s + c.amount, 0);
  const payee = commissions.filter(c => c.status === 'PAYEE').reduce((s, c) => s + c.amount, 0);
  const uniquePayers = new Set(commissions.map(c => c.userId)).size;
  const renouvellements = commissions.length - uniquePayers;

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
  const kpi = (label: string, value: string, color: string, sub?: string) => (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Rappel code */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-sm text-white/80 font-bold uppercase tracking-wide">Ton arme secrète</p>
          <p className="text-xl font-extrabold mt-1">Partage ton code, gagne {ambassador.commissionRate}% de commission récurrente</p>
        </div>
        <Link href="/ambassadeur/code" className="py-3 px-6 bg-white text-emerald-600 font-extrabold rounded-2xl text-sm uppercase tracking-wide shadow-md hover:bg-gray-100 whitespace-nowrap">
          🔑 Mon code
        </Link>
      </div>

      {/* Utilisateurs */}
      <section>
        <h2 className="text-lg font-extrabold text-gray-800 mb-4">👥 Ta communauté</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpi('Utilisateurs apportés', `${totalUsers}`, 'text-blue-600')}
          {kpi('Premium actifs (parmi eux)', `${premiumActifs}`, 'text-yellow-600')}
          {kpi('Nouveaux abonnements', `${uniquePayers}`, 'text-emerald-600')}
          {kpi('Renouvellements', `${renouvellements}`, 'text-emerald-500')}
        </div>
      </section>

      {/* Revenus */}
      <section>
        <h2 className="text-lg font-extrabold text-gray-800 mb-4">💰 Tes commissions ({ambassador.commissionRate}%)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpi('CA généré par ta communauté', fmt(caGenere), 'text-emerald-700', 'Paiements Premium validés')}
          {kpi('Commission de ce mois', fmt(commissionMois), 'text-purple-600')}
          {kpi('Commission cumulée', fmt(commissionCumulee), 'text-indigo-600')}
          {kpi('En attente de versement', fmt(enAttente), 'text-orange-500', `Déjà versée : ${fmt(payee)}`)}
        </div>
      </section>

      {/* Dernières commissions */}
      {commissions.length > 0 && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-extrabold text-gray-800">⏱️ Dernières commissions</h2>
            <Link href="/ambassadeur/commissions" className="text-xs font-bold text-blue-500 hover:underline">Tout voir →</Link>
          </div>
          <div className="space-y-2">
            {commissions.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl text-sm">
                <div>
                  <p className="font-bold text-gray-700">+{c.amount.toLocaleString('fr-FR')} FCFA</p>
                  <p className="text-xs text-gray-400">{c.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · paiement de {c.premiumRequest?.amount?.toLocaleString('fr-FR')} F</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.status === 'PAYEE' ? 'bg-emerald-100 text-emerald-600' : c.status === 'ANNULEE' ? 'bg-gray-200 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                  {c.status === 'PAYEE' ? '✅ Payée' : c.status === 'ANNULEE' ? 'Annulée' : '⏳ En attente'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {commissions.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-100 p-6 rounded-3xl text-center">
          <p className="text-4xl mb-2">🌱</p>
          <p className="font-bold text-yellow-700">Aucune commission pour l'instant</p>
          <p className="text-sm text-yellow-600 mt-1">Les commissions apparaissent quand tes utilisateurs souscrivent au Premium. Partage ton code !</p>
        </div>
      )}
    </div>
  );
}