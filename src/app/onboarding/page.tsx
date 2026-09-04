import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OnboardingCarousel from '@/components/onboarding/OnboardingCarousel';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'ADMIN') redirect('/admin');
  if (user.role === 'CORRECTEUR') redirect('/correcteur');
  if (user.onboardingCompleted) redirect('/etudiant');

  return <OnboardingCarousel prenom={user.prenom} />;
}