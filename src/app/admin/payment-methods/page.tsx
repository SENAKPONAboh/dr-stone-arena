import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import PaymentMethodManager from '@/components/admin/PaymentMethodManager';

export default async function AdminPaymentMethodsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl text-gray-800">Moyens de paiement</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-extrabold text-gray-800 mb-2">💳 Configuration des paiements Premium</h2>
          <p className="text-sm text-gray-500 mb-6">Configurez les moyens de paiement proposés aux étudiants sur la page Premium. Un moyen désactivé reste invisible côté étudiant, sans modification de code.</p>
          <PaymentMethodManager initialMethods={methods} />
        </div>
      </main>
    </div>
  );
}