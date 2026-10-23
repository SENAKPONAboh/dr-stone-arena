import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import WithdrawalManager from '@/components/admin/WithdrawalManager';
import RechargeManager from '@/components/admin/RechargeManager';
import UaCorrectionManager from '@/components/admin/UaCorrectionManager';

export default async function AdminUaPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen pb-12">

      <AdminHeader title="Trésorerie UA" subtitle="Primes Arena · Recharges · Corrections" icon="bank" tone="gold" />

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-8">
        <WithdrawalManager />
        <RechargeManager />
        <UaCorrectionManager />
      </main>
    </div>
  );
}