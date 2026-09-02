import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Link from 'next/link';
import PremiumPlans from '@/components/dashboard/PremiumPlans';
import prisma from '@/lib/prisma';

export default async function PremiumPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  // Vérifier si l'étudiant a déjà une demande en attente
  const pendingRequest = await prisma.premiumRequest.findFirst({
    where: { userId: user.id, status: 'EN_ATTENTE' },
    select: { tier: true }
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

        <PremiumPlans
          isPremium={user.isPremium}
          premiumTier={user.premiumTier ?? null}
          pendingTier={pendingRequest ? (pendingRequest.tier ?? null) : null}
        />

        <div className="mt-12 max-w-3xl mx-auto">
          <LogoutButton />
        </div>
      </main>
    </div>
  );
}