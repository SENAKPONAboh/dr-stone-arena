import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import AmbassadorManager from '@/components/admin/AmbassadorManager';

export default async function AdminAmbassadorsPage() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const now = new Date();

  const [ambassadors, referredCounts, premiumCounts, commissionsAll, allStudents] = await Promise.all([
    prisma.ambassador.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, prenom: true, nom: true, email: true, pays: true, universite: true } } }
    }),
    prisma.user.groupBy({ by: ['referredById'], where: { referredById: { not: null } }, _count: { _all: true } }),
    prisma.user.groupBy({ by: ['referredById'], where: { referredById: { not: null }, isPremium: true, premiumExpiresAt: { gt: now } }, _count: { _all: true } }),
    prisma.ambassadorCommission.findMany({
      select: { ambassadorId: true, status: true, amount: true, premiumRequest: { select: { amount: true } } }
    }),
    prisma.user.findMany({
      where: { role: 'ETUDIANT', statut: 'VALIDE' },
      select: { id: true, prenom: true, nom: true, email: true },
      orderBy: { nom: 'asc' },
      take: 500,
    }),
  ]);

  // Agrégation des stats par ambassadeur
  const usersByAmb = new Map(referredCounts.map(g => [g.referredById!, g._count._all]));
  const premiumByAmb = new Map(premiumCounts.map(g => [g.referredById!, g._count._all]));
  const comByAmb = new Map<string, { total: number; pending: number; paid: number; ca: number }>();
  for (const c of commissionsAll) {
    const acc = comByAmb.get(c.ambassadorId) ?? { total: 0, pending: 0, paid: 0, ca: 0 };
    acc.total += c.amount;
    if (c.status === 'EN_ATTENTE') acc.pending += c.amount;
    if (c.status === 'PAYEE') acc.paid += c.amount;
    acc.ca += c.premiumRequest?.amount ?? 0;
    comByAmb.set(c.ambassadorId, acc);
  }

  const ambassadorUserIds = new Set(ambassadors.map(a => a.userId));
  const students = allStudents.filter(s => !ambassadorUserIds.has(s.id));

  const ambassadorsWithStats = ambassadors.map(a => {
    const com = comByAmb.get(a.id);
    return {
      id: a.id, referralCode: a.referralCode, status: a.status, commissionRate: a.commissionRate,
      user: a.user,
      stats: {
        users: usersByAmb.get(a.id) ?? 0,
        premium: premiumByAmb.get(a.id) ?? 0,
        caGenere: com?.ca ?? 0,
        commissionTotal: com?.total ?? 0,
        commissionPending: com?.pending ?? 0,
        commissionPaid: com?.paid ?? 0,
      }
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">🤝 Gestion des Ambassadeurs</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-6">
            Crée et gère le réseau d'ambassadeurs. Un ambassadeur <b>Actif</b> peut faire utiliser son code à l'inscription ; chaque paiement Premium validé de ses référés génère une commission de <b>10%</b> (récurrente). Les versements basculent les commissions en attente en "Payées".
          </p>
          <AmbassadorManager ambassadors={ambassadorsWithStats} students={students} />
        </div>
      </main>
    </div>
  );
}