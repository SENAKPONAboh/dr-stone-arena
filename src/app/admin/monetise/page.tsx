import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AdminHeader from '@/components/admin/ui/AdminHeader';
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
    <div className="min-h-screen pb-12">
      <AdminHeader title="Validation des Pass Élite" subtitle="Accès à l'Espace Élite" icon="gem" tone="gold" />

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="adm-card p-4 sm:p-6">
          <p className="text-sm text-gray-500 mb-6">
            Vérifie chaque reçu (2 000 FCFA) puis active le Pass Élite : l'étudiant entre dans l'Espace Élite pour 30 jours (ajoutés à son Pass en cours s'il en a un).
          </p>
          <PassValidationManager requests={requestsWithUrls} />
        </div>
      </main>
    </div>
  );
}