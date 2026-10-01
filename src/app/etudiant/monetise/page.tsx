import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MonetiseDashboard from '@/components/monetise/MonetiseDashboard';
import MonetiseNav from '@/components/monetise/MonetiseNav';

export default async function MonetiseHomePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  // Sans Pass actif → page de présentation/vente
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  return (
    // 🖥️📱 ESPACE MONÉTISÉ PLEIN ÉCRAN : recouvre la coquille classique (HUD + barre du bas)
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain elite-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <MonetiseNav passActive={true} />
        <MonetiseDashboard
          uaBalance={user.uaBalance}
          streak={user.streak}
          passExpiresAt={user.passExpiresAt ? user.passExpiresAt.toISOString() : null}
        />
        <Link href="/etudiant" className="block text-center py-3 text-white/40 text-sm font-bold hover:text-yellow-300">
          ← Retour à l'espace classique
        </Link>
      </div>
    </div>
  );
}