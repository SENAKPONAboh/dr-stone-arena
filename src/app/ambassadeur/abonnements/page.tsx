import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getPlanLabel } from '@/lib/premium';

export default async function AmbassadorSubsPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true }
  });
  if (!ambassador || ambassador.status !== 'ACTIF') redirect('/etudiant');

  const commissions = await prisma.ambassadorCommission.findMany({
    where: { ambassadorId: ambassador.id, status: { not: 'ANNULEE' } },
    orderBy: { createdAt: 'desc' },
    select: {
      amount: true, createdAt: true, userId: true,
      premiumRequest: { select: { tier: true, amount: true } }
    }
  });

  // Type : la 1re transaction d'un utilisateur = "Nouveau", les suivantes = "Renouvellement"
  const sortedAsc = [...commissions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const firstTxUsers = new Set<string>();
  for (const c of sortedAsc) firstTxUsers.add(c.userId);
  // Note : userId apparaît dans firstTxUsers après traitement — il faut capter la PREMIÈRE occurrence
  const firstTx = new Map<string, boolean>();
  for (const c of sortedAsc) {
    if (!firstTx.has(c.userId)) firstTx.set(c.userId, true); else firstTx.set(c.userId, false);
  }

  const caTotal = commissions.reduce((s, c) => s + (c.premiumRequest?.amount ?? 0), 0);
  const commissionTotal = commissions.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold text-gray-800">💎 Mes abonnements générés ({commissions.length})</h2>

      {commissions.length === 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-100 p-6 rounded-3xl text-center">
          <p className="text-4xl mb-2">🌱</p>
          <p className="font-bold text-yellow-700">Aucun abonnement généré pour l'instant</p>
          <p className="text-sm text-yellow-600 mt-1">Ils apparaîtront quand tes utilisateurs souscriront au Premium.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">CA généré</p>
              <p className="text-2xl font-extrabold text-emerald-600">{caTotal.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Commissions associées</p>
              <p className="text-2xl font-extrabold text-purple-600">{commissionTotal.toLocaleString('fr-FR')} FCFA</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Formule</th>
                  <th className="py-2 pr-4 text-right">Montant</th>
                  <th className="py-2 pr-4 text-right">Commission</th>
                  <th className="py-2 text-right">Type</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{c.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</td>
                    <td className="py-2.5 pr-4 font-bold text-gray-700 whitespace-nowrap">{c.premiumRequest?.tier ? getPlanLabel(c.premiumRequest.tier) : '—'}</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-gray-600 whitespace-nowrap">{c.premiumRequest?.amount?.toLocaleString('fr-FR') ?? '—'} F</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-purple-600 whitespace-nowrap">+{c.amount.toLocaleString('fr-FR')} F</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${firstTx.get(c.userId) ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {firstTx.get(c.userId) ? 'Nouveau' : 'Renouvellement'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}