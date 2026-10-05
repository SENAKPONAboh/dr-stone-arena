import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import AmbassadorNav from '@/components/ambassador/AmbassadorNav';
import AmbassadorGate from '@/components/ambassador/AmbassadorGate';
import PanelLockButton from '@/components/ambassador/PanelLockButton';
import { getPanelState } from '@/lib/ambassador-panel';

export default async function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role === 'ADMIN') redirect('/admin');
  if (user.role === 'CORRECTEUR') redirect('/correcteur');

  // 🔒 Accès strict : être un Ambassador ACTIF (vérifié en base à chaque navigation)
  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
    select: { id: true, referralCode: true, status: true }
  });

  if (!ambassador || ambassador.status !== 'ACTIF') {
    redirect('/etudiant'); // pas ambassadeur (ou suspendu/en attente) → espace étudiant
  }

  // 🔐 Mot de passe propre au panel (à choisir la 1re fois, à saisir ensuite)
  const panel = await getPanelState(user.id, ambassador.id);
  const gated = panel === 'NEEDS_SETUP' || panel === 'LOCKED';

  return (
    <div className="arena-skin min-h-screen bg-stone pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-gray-800">🤝 Espace Ambassadeur</h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Dr. Stone Arena</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold whitespace-nowrap">
              🔑 {ambassador.referralCode}
            </span>
            {!gated && panel !== 'OPEN' && <PanelLockButton />}
            <Link href="/etudiant" className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-bold hover:bg-gray-200 whitespace-nowrap">
              ← Arène
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {gated ? (
          <div className="mt-10"><AmbassadorGate mode={panel === 'NEEDS_SETUP' ? 'setup' : 'unlock'} /></div>
        ) : (
          <>
            <AmbassadorNav />
            <div className="mt-6">{children}</div>
          </>
        )}
      </main>
    </div>
  );
}