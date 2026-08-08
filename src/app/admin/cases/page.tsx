import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import CaseForm from '@/components/admin/CaseForm';
import Link from 'next/link';

export default async function AdminCasesPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Récupérer les matières et chapitres pour les menus déroulants
  const subjects = await prisma.subject.findMany();
  const chapters = await prisma.chapter.findMany();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl text-gray-800">Créer un cas clinique</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <CaseForm subjects={subjects} chapters={chapters} />
        </div>
      </main>
    </div>
  );
}