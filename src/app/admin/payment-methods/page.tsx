import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import PaymentMethodManager from '@/components/admin/PaymentMethodManager';

export default async function AdminPaymentMethodsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
  });

  return (
    <div className="min-h-screen pb-12">

      <AdminHeader title="Moyens de paiement" subtitle="Premium, Pass Élite et recharges" icon="card" tone="mala" />

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="adm-card p-4 sm:p-6">
          <h2 className="text-xl font-extrabold text-gray-800 mb-2">Configuration des paiements</h2>
          <p className="text-sm text-gray-500 mb-6">Configurez les moyens de paiement proposés aux étudiants (Premium, Pass Élite, recharges et Primes). Un moyen désactivé reste invisible côté étudiant, sans modification de code.</p>
          <PaymentMethodManager initialMethods={methods} />
        </div>
      </main>
    </div>
  );
}