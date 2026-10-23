import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import StructuredCaseImporter from '@/components/admin/StructuredCaseImporter';

export default async function AdminCasesStructuredPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen pb-12">

      <AdminHeader title="Import QCM structurés" subtitle="Banque de cas" icon="file" tone="sky" />

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <StructuredCaseImporter />
      </main>
    </div>
  );
}