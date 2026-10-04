import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import PassValidationManager from '@/components/admin/PassValidationManager';
import { getReceiptSignedUrl } from '@/lib/supabase-storage';

export default async function AdminMonetisePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  const requests = await prisma.passRequest.findMany({
    where: { status: 'EN_ATTENTE' },
    include: {
      user: { select: { id: true, prenom: true, nom: true, email: true } },
      paymentMethod: { select: { name: true, icon: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const requestsWithUrls = await Promise.all(
    requests.map(async (req) => {
      const isBase64 = req.receiptUrl.startsWith('data:');
      const signedUrl = isBase64 ? req.receiptUrl : await getReceiptSignedUrl(req.receiptUrl);
      return { ...req, displayUrl: signedUrl };
    })
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
          <h1 className="font-extrabold text-xl text-gray-800">🪙 Validation des Pass Monétisés</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-6">
            Valide les demandes de Pass Arène Monétisé (2 000 FCFA/mois). La validation active l'accès à la plateforme monétisée pendant 30 jours.
          </p>
          <PassValidationManager requests={requestsWithUrls} />
        </div>
      </main>
    </div>
  );
}