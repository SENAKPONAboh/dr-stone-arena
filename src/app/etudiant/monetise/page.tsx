import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MonetiseDashboard from '@/components/monetise/MonetiseDashboard';

export default async function MonetiseHomePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  // Sans Pass actif → page de présentation/vente
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  return (
    <MonetiseDashboard
      uaBalance={user.uaBalance}
      streak={user.streak}
      passExpiresAt={user.passExpiresAt ? user.passExpiresAt.toISOString() : null}
    />
  );
}