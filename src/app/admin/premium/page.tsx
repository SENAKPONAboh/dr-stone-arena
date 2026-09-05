import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import ValidatePremiumButton from '@/components/admin/ValidatePremiumButton';
import { getPlan, getPlanLabel } from '@/lib/premium';
import { getReceiptSignedUrl } from '@/lib/supabase-storage';

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
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl text-gray-800">Validation Premium</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        
        {requestsWithUrls.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune demande en attente</h2>
            <p className="text-gray-500">Toutes les demandes Premium ont été traitées.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requestsWithUrls.map((req) => (
              <div key={req.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  {req.displayUrl ? (
                    <a href={req.displayUrl} target="_blank" rel="noopener noreferrer">
                      <img src={req.displayUrl} alt="Reçu de paiement" className="w-full h-auto rounded-2xl border-2 border-gray-100 object-cover hover:opacity-90 transition-opacity" />
                    </a>
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
                  
                  <div className="mt-auto flex gap-3">
                    <ValidatePremiumButton requestId={req.id} userId={req.user.id} action="VALIDE" />
                    <ValidatePremiumButton requestId={req.id} userId={req.user.id} action="REJETE" />
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