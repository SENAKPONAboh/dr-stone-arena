import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import ResetPasswordButton from '@/components/admin/ResetPasswordButton';
import BanButton from '@/components/admin/BanButton';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const students = await prisma.user.findMany({
    where: { role: 'ETUDIANT' },
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      prenom: true, 
      nom: true, 
      email: true, 
      universite: true, 
      anneeEtude: true, 
      isPremium: true, 
      statut: true 
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">Gestion des Étudiants</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-3">
            {students.map(u => (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-4">
                <div>
                  <p className="font-bold text-gray-800">
                    {u.prenom} {u.nom} {u.isPremium && '👑'}
                    {u.statut === 'BANNI' && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">BANNI</span>}
                  </p>
                  <p className="text-sm text-gray-500">{u.email} • {u.universite} ({u.anneeEtude}ème année)</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 items-end">
                  <ResetPasswordButton userId={u.id} />
                  <BanButton userId={u.id} isBanned={u.statut === 'BANNI'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}