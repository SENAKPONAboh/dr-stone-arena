import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Link from 'next/link';
import TogglePremiumButton from '@/components/dashboard/TogglePremiumButton';
import prisma from '@/lib/prisma';

export default async function PremiumPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  // Vérifier si l'étudiant a déjà une demande en attente
  const pendingRequest = await prisma.premiumRequest.findFirst({
    where: { userId: user.id, status: 'EN_ATTENTE' }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/etudiant" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl text-gray-800">Abonnement Premium</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-800">Passe à la vitesse supérieure ⚡</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">Débloque tout le potentiel de Dr. Stone Arena pour réviser sans limite et devenir le meilleur clinicien de ta promotion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          
          {/* Plan Gratuit */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800">Gratuit</h3>
            <p className="text-gray-500 text-sm mb-6">Pour commencer en douceur</p>
            
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-800">0 FCFA</span>
              <span className="text-gray-500">/mois</span>
            </div>

            <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-grow">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 5 Vies maximum
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Régénération d'1 vie toutes les 24h
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Accès aux cas cliniques de base
              </li>
            </ul>

            <div className="w-full py-3 bg-gray-100 text-gray-400 font-bold rounded-2xl text-center uppercase tracking-wide text-sm">
              Votre plan actuel
            </div>
          </div>

          {/* Plan Premium */}
          <div className={`bg-white rounded-3xl shadow-xl border-2 p-8 flex flex-col relative ${user.isPremium ? 'border-emerald-500' : 'border-yellow-400'}`}>
            {user.isPremium && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                VOTRE PLAN ACTUEL
              </div>
            )}
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800">Premium</h3>
              <span className="text-2xl">👑</span>
            </div>
            <p className="text-gray-500 text-sm mb-6">Pour réviser sans limite</p>
            
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-800">2250 FCFA</span>
              <span className="text-gray-500">/mois</span>
            </div>

            <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-grow">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 5 Vies maximum
              </li>
              <li className="flex items-center gap-2 font-bold text-gray-800">
                <span className="text-emerald-500">✓</span> Régénération d'1 vie toutes les 40 min !
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Accès à tous les cas exclusifs
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Défis quotidiens et hebdomadaires spéciaux
              </li>
            </ul>

            {user.isPremium ? (
              <div className="w-full py-3 bg-emerald-50 text-emerald-600 font-bold rounded-2xl text-center uppercase tracking-wide text-sm">
                ✅ Abonnement Actif
              </div>
            ) : pendingRequest ? (
              <div className="w-full p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-center">
                <p className="font-bold text-yellow-700">⏳ Reçu en cours de validation</p>
                <p className="text-sm text-yellow-600 mt-1">L'administrateur va bientôt valider votre paiement.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                  <p className="font-bold mb-2">Instructions de paiement :</p>
                  <p>1. Envoyez <span className="font-extrabold">2250 FCFA</span> au numéro <span className="font-extrabold">+227 90016284</span>.</p>
                  <p>2. Prenez une capture d'écran ou photo du reçu.</p>
                  <p>3. Envoyez l'image ci-dessous.</p>
                </div>
                <TogglePremiumButton />
              </div>
            )}
          </div>

        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <LogoutButton />
        </div>
      </main>
    </div>
  );
}