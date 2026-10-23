import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import ValidatePremiumButton from '@/components/admin/ValidatePremiumButton';
import { getPlan, getPlanLabel } from '@/lib/premium';
import { getReceiptSignedUrl } from '@/lib/supabase-storage';
import ReceiptImage from '@/components/admin/ReceiptImage';

export default async function AdminPremiumPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Récupérer toutes les demandes en attente
  const requests = await prisma.premiumRequest.findMany({
    where: { status: 'EN_ATTENTE' },
    include: {
      user: { select: { id: true, prenom: true, nom: true, email: true } },
      paymentMethod: { select: { name: true, icon: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Générer les URLs signées UNIQUEMENT pour les reçus stockés dans le bucket
  // (les anciennes demandes en base64 s'affichent directement, compatibilité conservée)
  const requestsWithUrls = await Promise.all(
    requests.map(async (req) => {
      const isBase64 = req.receiptUrl.startsWith('data:');
      const signedUrl = isBase64 ? req.receiptUrl : await getReceiptSignedUrl(req.receiptUrl);
      return { ...req, displayUrl: signedUrl };
    })
  );

  return (
    <div className="min-h-screen pb-12">
      
      <AdminHeader title="Validation Premium" subtitle="Reçus en attente" icon="crown" tone="sky" />

      <main className="max-w-6xl mx-auto px-4 mt-6">
        
        {requestsWithUrls.length === 0 ? (
          <div className="adm-card p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune demande en attente</h2>
            <p className="text-gray-500">Toutes les demandes Premium ont été traitées.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requestsWithUrls.map((req) => (
              <div key={req.id} className="adm-card p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  {req.displayUrl ? (
                    <ReceiptImage src={req.displayUrl} />
                  ) : (
                    <div className="w-full py-8 bg-red-50 border-2 border-red-100 rounded-2xl text-center">
                      <p className="text-red-500 font-bold text-sm">⚠️ Reçu illisible</p>
                      <p className="text-xs text-red-400 mt-1">Fichier introuvable dans le stockage</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800">Demande de {req.user.prenom} {req.user.nom}</h3>
                  <p className="text-sm text-gray-500 mb-2">Email : {req.user.email}</p>
                  <p className="text-sm text-gray-500 mb-2">Plan demandé : <span className="font-bold text-blue-600">{req.tier ? `${getPlanLabel(req.tier)} — ${getPlan(req.tier)?.priceLabel}` : 'Non précisé'}</span></p>
                  <p className="text-sm text-gray-500 mb-2">Moyen de paiement : <span className="font-bold text-gray-700">{req.paymentMethod ? `${req.paymentMethod.icon ?? ''} ${req.paymentMethod.name}` : 'Non précisé'}</span></p>
                  {req.amount && (
                    <p className="text-sm text-gray-500 mb-2">Montant payé : <span className="font-bold text-emerald-600">{req.amount.toLocaleString('fr-FR')} FCFA</span></p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">Date : {new Date(req.createdAt).toLocaleString('fr-FR')}</p>
                  
                  <div className="mt-auto">
                    <ValidatePremiumButton requestId={req.id} userId={req.user.id} name={`${req.user.prenom} ${req.user.nom}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}