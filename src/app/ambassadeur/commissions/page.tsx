import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getPlanLabel } from '@/lib/premium';

export default async function AmbassadorCommissionsPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true }
  });
  if (!ambassador || ambassador.status !== 'ACTIF') redirect('/etudiant');

  const commissions = await prisma.ambassadorCommission.findMany({
    where: { ambassadorId: ambassador.id },
    orderBy: { createdAt: 'desc' },
    select: {
      amount: true, status: true, createdAt: true, paidAt: true,
      premiumRequest: { select: { tier: true, amount: true } }
    }
  });

  const enAttente = commissions.filter(c => c.status === 'EN_ATTENTE').reduce((s, c) => s + c.amount, 0);
  const payee = commissions.filter(c => c.status === 'PAYEE').reduce((s, c) => s + c.amount, 0);
  const annulee = commissions.filter(c => c.status === 'ANNULEE').reduce((s, c) => s + c.amount, 0);

  const statusInfo = (s: string) => {
    switch (s) {
      case 'PAYEE': return { cls: 'bg-emerald-100 text-emerald-600', label: '✅ Payée' };
      case 'ANNULEE': return { cls: 'bg-gray-200 text-gray-500', label: 'Annulée' };
      default: return { cls: 'bg-yellow-100 text-yellow-700', label: '⏳ En attente' };
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold text-gray-800">💰 Mes commissions</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">⏳ En attente de versement</p>
          <p className="text-2xl font-extrabold text-orange-500">{enAttente.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">✅ Déjà versées</p>
          <p className="text-2xl font-extrabold text-emerald-600">{payee.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">↩️ Annulées</p>
          <p className="text-2xl font-extrabold text-gray-400">{annulee.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-100 p-6 rounded-3xl text-center">
          <p className="text-4xl mb-2">🌱</p>
          <p className="font-bold text-yellow-700">Aucune commission pour l'instant</p>
          <p className="text-sm text-yellow-600 mt-1">Elles apparaissent automatiquement quand tes utilisateurs paient leur Premium.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Formule</th>
                <th className="py-2 pr-4 text-right">Paiement</th>
                <th className="py-2 pr-4 text-right">Commission</th>
                <th className="py-2 pr-4">Statut</th>
                <th className="py-2 text-right">Versée le</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c, i) => {
                const si = statusInfo(c.status);
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{c.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-2.5 pr-4 font-bold text-gray-700 whitespace-nowrap">{c.premiumRequest?.tier ? getPlanLabel(c.premiumRequest.tier) : '—'}</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-gray-600 whitespace-nowrap">{c.premiumRequest?.amount?.toLocaleString('fr-FR') ?? '—'} F</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-purple-600 whitespace-nowrap">+{c.amount.toLocaleString('fr-FR')} F</td>
                    <td className="py-2.5 pr-4"><span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${si.cls}`}>{si.label}</span></td>
                    <td className="py-2.5 text-right text-gray-400 whitespace-nowrap">{c.paidAt ? c.paidAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}