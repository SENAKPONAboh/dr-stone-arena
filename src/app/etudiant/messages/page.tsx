import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MessagesClient from '@/components/messages/MessagesClient';

export default async function MessagesPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');
  if (user.role !== 'ETUDIANT') redirect('/login');
  if (user.statut !== 'VALIDE') redirect('/login?error=non_valide');

  return <MessagesClient me={{ id: user.id }} />;
}