import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ContentManagerForm from '@/components/admin/ContentManagerForm';
import Link from 'next/link';

export default async function AdminContentPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  const subjects = await prisma.subject.findMany({
    orderBy: { anneeEtude: 'asc' }
  });

  // Regrouper les matières par année pour l'affichage
  const subjectsByYear: { [key: number]: typeof subjects } = {};
  subjects.forEach(s => {
    if (!subjectsByYear[s.anneeEtude]) subjectsByYear[s.anneeEtude] = [];
    subjectsByYear[s.anneeEtude].push(s);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl text-gray-800">Gestion du Contenu</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <ContentManagerForm subjects={subjects} />
        </div>

        <h2 className="text-xl font-extrabold text-gray-800 mb-4">📋 Matières et Chapitres actuels</h2>
        <div className="space-y-6">
          {Object.entries(subjectsByYear).map(([year, subs]) => (
            <div key={year} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-blue-600 mb-4">{year}ème Année</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subs.map(s => (
                  <div key={s.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="font-bold text-gray-800">{s.name}</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-500">
                      {/* On récupère les chapitres de chaque matière */}
                      {/* Pour éviter trop de requêtes SQL ici, on le fera simplement si nécessaire, 
                          mais pour l'exemple on affiche juste l'ID pour l'instant */}
                      <li className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                        Voir les chapitres (ID: {s.id.substring(0,8)}...)
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}