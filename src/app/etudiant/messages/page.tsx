import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MessagesClient from '@/components/messages/MessagesClient';

export default async function MessagesPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ETUDIANT') redirect('/login');
  if (user.statut !== 'VALIDE') redirect('/api/auth/logout');

  return <MessagesClient me={{ id: user.id }} />;
}