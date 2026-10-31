import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import ResetDataManager from '@/components/admin/ResetDataManager';
import DeleteTestAccountsManager, { type CleanupAccount } from '@/components/admin/DeleteTestAccountsManager';
import { LAUNCH_PROTECTION_DATE } from '@/lib/launch-protection';

export default async function AdminResetPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  const rows = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, prenom: true, nom: true, pseudo: true, email: true, role: true, xp: true, createdAt: true },
  });
  const accounts: CleanupAccount[] = rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    protectedReason: r.id === user.id ? 'MOI' : r.role === 'ADMIN' ? 'ADMIN' : r.createdAt >= LAUNCH_PROTECTION_DATE ? 'RECENT' : null,
  }));

  return (
    <div className="min-h-screen pb-12">
      <AdminHeader title="Initialisation des données" subtitle="Zone dangereuse" icon="bomb" tone="heart" />

      <main className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl mb-6">
          <p className="text-sm text-red-700">
            🔴 <b>Zone dangereuse.</b> À utiliser uniquement pour repartir de zéro avant le lancement officiel.
            Cette page réinitialise toutes les données de jeu (XP, grades, duels, badges, paiements...) mais <b>conserve la banque de cas cliniques et les comptes</b>, sauf si tu coches l'option « Supprimer aussi la banque » au moment de confirmer.
          </p>
        </div>
        <ResetDataManager />

        <div className="mt-10">
          <DeleteTestAccountsManager accounts={accounts} />
        </div>
      </main>
    </div>
  );
}
