import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PassPresentation from '@/components/monetise/PassPresentation';

export default async function PassPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  return <PassPresentation passActive={user.passActive} />;
}