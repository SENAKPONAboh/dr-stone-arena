import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/dashboard/LogoutButton';
import SuspectsManager from '@/components/admin/SuspectsManager';

export default async function AdminSuspectsPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600" title="Retour au panel">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl flex items-center justify-center text-xl shadow-lg">🔍</div>
            <div>
              <h1 className="font-extrabold text-lg text-gray-800">Journal des Suspects</h1>
              <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Détection anti-triche IA</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <SuspectsManager />
      </main>
    </div>
  );
}