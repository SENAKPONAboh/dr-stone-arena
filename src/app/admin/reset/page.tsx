import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ResetDataManager from '@/components/admin/ResetDataManager';

export default async function AdminResetPage() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">⚠️ Initialisation des données</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl mb-6">
          <p className="text-sm text-red-700">
            🔴 <b>Zone dangereuse.</b> À utiliser uniquement pour repartir de zéro avant le lancement officiel.
            Cette page réinitialise toutes les données de jeu (XP, grades, duels, badges, paiements...) mais <b>conserve la banque de cas cliniques et les comptes</b>.
          </p>
        </div>
        <ResetDataManager />
      </main>
    </div>
  );
}