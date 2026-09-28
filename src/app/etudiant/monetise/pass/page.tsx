import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import PassPresentation from '@/components/monetise/PassPresentation';
import MonetiseNav from '@/components/monetise/MonetiseNav';

export default async function PassPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const pendingRequest = await prisma.passRequest.findFirst({
    where: { userId: user.id, status: 'EN_ATTENTE' },
    include: { paymentMethod: { select: { name: true, icon: true } } }
  });

  const activeMethods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, icon: true, beneficiaryName: true, paymentIdentifier: true, instructions: true }
  });

  return (
    // 🖥️📱 ESPACE MONÉTISÉ PLEIN ÉCRAN : recouvre la coquille classique
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-gradient-to-br from-[#0f0a05] via-[#1a1308] to-[#0f0a05] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Navigation monétisée — uniquement si Pass actif (contexte renouvellement).
            Non-abonnés : cette page est la vitrine, pas de navigation vers des pages
            qui les renverraient ici en boucle. */}
        {user.passActive && <MonetiseNav passActive={true} />}

        <PassPresentation
          passActive={user.passActive}
          passExpiresAt={user.passExpiresAt ? user.passExpiresAt.toISOString() : null}
          pendingRequest={pendingRequest ? {
            methodName: pendingRequest.paymentMethod?.name ?? null,
            methodIcon: pendingRequest.paymentMethod?.icon ?? null,
            createdAt: pendingRequest.createdAt.toISOString(),
          } : null}
          activeMethods={activeMethods}
        />

        <Link href="/etudiant" className="block text-center py-3 text-white/40 text-sm font-bold hover:text-yellow-300">
          ← Retour à l'espace classique
        </Link>
      </div>
    </div>
  );
}