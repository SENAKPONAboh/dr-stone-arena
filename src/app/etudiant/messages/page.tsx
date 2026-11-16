import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MessagesClient from '@/components/messages/MessagesClient';

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ avec?: string }> }) {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ETUDIANT') redirect('/login');
  if (user.statut !== 'VALIDE') redirect('/api/auth/logout');

  const { avec } = await searchParams;
  return <MessagesClient me={{ id: user.id }} openWith={typeof avec === 'string' ? avec : undefined} />;
}