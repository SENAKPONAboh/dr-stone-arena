import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ValidateButton from '@/components/admin/ValidateButton';
import Link from 'next/link';
import LogoutButton from '@/components/dashboard/LogoutButton';
import SendPushButton from '@/components/admin/SendPushButton';

export default async function AdminDashboard() {
  const user = await getCurrentUser();

  // Sécurité
  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Récupérer les données
  const pendingUsers = await prisma.user.findMany({
    where: { statut: 'EN_ATTENTE', role: 'ETUDIANT' },
    orderBy: { createdAt: 'desc' }
  });

  const totalUsers = await prisma.user.count({ where: { role: 'ETUDIANT' }});
  const totalCases = await prisma.clinicalCase.count();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="font-extrabold text-xl text-gray-800">Panel Administrateur</h1>
          </div>
                  <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        
        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-bold mb-1">Étudiants inscrits</p>
            <p className="text-3xl font-extrabold text-blue-600">{totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-bold mb-1">Cas cliniques disponibles</p>
            <p className="text-3xl font-extrabold text-emerald-600">{totalCases}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-bold mb-1">Comptes en attente</p>
            <p className="text-3xl font-extrabold text-orange-600">{pendingUsers.length}</p>
          </div>
        </div>

        {/* Gestion des validations */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-extrabold text-gray-800 mb-4">⏳ Étudiants en attente de validation</h2>
          
          {pendingUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-2xl">Aucun étudiant en attente. C'est tout bon ! ✅</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-4">
                  <div>
                    <p className="font-bold text-gray-800">{u.prenom} {u.nom}</p>
                    <p className="text-sm text-gray-500">{u.email} • {u.universite} - {u.faculte} ({u.anneeEtude}ème année)</p>
                  </div>
                  <ValidateButton userId={u.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lien pour créer des cas et valider Premium */}
        <div className="bg-gradient-to-r from-blue-500 to-emerald-500 rounded-3xl shadow-sm p-8 text-center">
          <h2 className="text-xl font-extrabold text-white mb-2">Gérer la plateforme</h2>
          <p className="text-blue-50 mb-6">Créez de nouveaux cas cliniques ou validez les abonnements Premium.</p>
          
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/admin/cases" className="inline-block bg-white text-blue-600 font-extrabold py-3 px-8 rounded-2xl shadow-md hover:bg-gray-100 transition-all">
              📝 Créer un cas clinique
            </Link>
            <Link href="/admin/premium" className="inline-block bg-gray-900 text-yellow-400 font-extrabold py-3 px-8 rounded-2xl shadow-md hover:bg-gray-800 transition-all">
              👑 Valider les abonnements Premium
            </Link>
                        <Link href="/admin/users" className="inline-block bg-white text-blue-600 font-extrabold py-3 px-8 rounded-2xl shadow-md hover:bg-gray-100 transition-all">
              👥 Gérer les étudiants
            </Link>
            <Link href="/admin/content" className="inline-block bg-emerald-500 text-white font-extrabold py-3 px-8 rounded-2xl shadow-md hover:bg-emerald-600 transition-all">
              📚 Gérer les matières et chapitres
            </Link>
             <Link href="/admin/users" className="inline-block bg-white text-blue-600 font-extrabold py-3 px-8 rounded-2xl shadow-md hover:bg-gray-100 transition-all">
              👥 Gérer les étudiants
            </Link>
            <SendPushButton />
          </div>
        </div>

      </main>
    </div>
  );
}