import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import SuspectsManager from '@/components/admin/SuspectsManager';

export default async function AdminSuspectsPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen pb-12">

      <AdminHeader title="Journal des suspects" subtitle="Détection anti-triche" icon="shield" tone="heart" />

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <SuspectsManager />
      </main>
    </div>
  );
}