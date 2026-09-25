import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getNiveauLabel } from '@/lib/niveau';
import { getPlanLabel } from '@/lib/premium';

export default async function AmbassadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const { id } = await params;

  const ambassador = await prisma.ambassador.findUnique({
    where: { id },
    include: { user: { select: { prenom: true, nom: true, email: true, pays: true, universite: true } } }
  });
  if (!ambassador) redirect('/admin/ambassadors');

  const now = new Date();
  const [referredUsers, commissions, payouts] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: ambassador.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, prenom: true, nom: true, email: true, anneeEtude: true, isPremium: true, premiumExpiresAt: true, createdAt: true }
    }),
    prisma.ambassadorCommission.findMany({
      where: { ambassadorId: ambassador.id },
      orderBy: { createdAt: 'desc' },
      include: { premiumRequest: { select: { tier: true, amount: true } } }
    }),
    prisma.ambassadorPayout.findMany({
      where: { ambassadorId: ambassador.id },
      orderBy: { paidAt: 'desc' }
    }),
  ]);

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
  const enAttente = commissions.filter(c => c.status === 'EN_ATTENTE').reduce((s, c) => s + c.amount, 0);
  const payee = commissions.filter(c => c.status === 'PAYEE').reduce((s, c) => s + c.amount, 0);
  const caGenere = commissions.reduce((s, c) => s + (c.premiumRequest?.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/ambassadors" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">🤝 {ambassador.user.prenom} {ambassador.user.nom}</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-8">

        {/* Résumé */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Code</p>
            <p className="text-lg font-extrabold text-emerald-600">{ambassador.referralCode}</p>
            <p className="text-xs text-gray-400 mt-1">{ambassador.status}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">👥 Utilisateurs</p>
            <p className="text-2xl font-extrabold text-blue-600">{referredUsers.length}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">CA généré</p>
            <p className="text-2xl font-extrabold text-emerald-600">{fmt(caGenere)}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">⏳ En attente</p>
            <p className="text-2xl font-extrabold text-orange-500">{fmt(enAttente)}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">✅ Versées</p>
            <p className="text-2xl font-extrabold text-purple-600">{fmt(payee)}</p>
          </div>
        </div>

        {/* Utilisateurs apportés */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="font-extrabold text-gray-800 mb-4">👥 Utilisateurs apportés ({referredUsers.length})</h2>
          {referredUsers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-2xl">Aucun utilisateur pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {referredUsers.map(u => {
                const actif = u.isPremium && u.premiumExpiresAt && new Date(u.premiumExpiresAt) > now;
                return (
                  <div key={u.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl text-sm">
                    <div>
                      <p className="font-bold text-gray-700">{u.prenom} {u.nom} {actif && '👑'}</p>
                      <p className="text-xs text-gray-400">{u.email} · {getNiveauLabel(u.anneeEtude)} · inscrit le {u.createdAt.toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${actif ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'}`}>
                      {actif ? 'Premium actif' : 'Gratuit'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Commissions */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="font-extrabold text-gray-800 mb-4">💰 Commissions ({commissions.length})</h2>
          {commissions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-2xl">Aucune commission (le branchement des paiements arrive en Phase 8).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                    <th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Formule</th>
                    <th className="py-2 pr-4 text-right">Paiement</th><th className="py-2 pr-4 text-right">Commission</th>
                    <th className="py-2 pr-4">Statut</th><th className="py-2 text-right">Versée le</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{c.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</td>
                      <td className="py-2.5 pr-4 font-bold text-gray-700">{c.premiumRequest?.tier ? getPlanLabel(c.premiumRequest.tier) : '—'}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-600">{c.premiumRequest?.amount?.toLocaleString('fr-FR') ?? '—'} F</td>
                      <td className="py-2.5 pr-4 text-right font-bold text-purple-600">+{c.amount.toLocaleString('fr-FR')} F</td>
                      <td className="py-2.5 pr-4 text-xs font-bold">{c.status === 'PAYEE' ? '✅ Payée' : c.status === 'ANNULEE' ? 'Annulée' : '⏳ En attente'}</td>
                      <td className="py-2.5 text-right text-gray-400 text-xs">{c.paidAt ? c.paidAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Versements */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="font-extrabold text-gray-800 mb-4">📤 Versements enregistrés ({payouts.length})</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-2xl">Aucun versement pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-purple-50 rounded-2xl text-sm">
                  <div>
                    <p className="font-bold text-purple-700">-{p.amount.toLocaleString('fr-FR')} FCFA</p>
                    <p className="text-xs text-gray-400">Versé le {p.paidAt.toLocaleDateString('fr-FR')}{p.note ? ` · ${p.note}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}