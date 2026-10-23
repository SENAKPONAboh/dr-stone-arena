import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import CaseForm from '@/components/admin/CaseForm';
import AdminHeader from '@/components/admin/ui/AdminHeader';

export default async function AdminCasesPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Récupérer les matières et chapitres pour les menus déroulants
  const subjects = await prisma.subject.findMany();
  const chapters = await prisma.chapter.findMany();

  return (
    <div className="min-h-screen pb-12">
      
      <AdminHeader title="Créer un cas clinique" subtitle="Banque de cas" icon="plus" tone="mala" />

      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="adm-card p-4 sm:p-8">
          <CaseForm subjects={subjects} chapters={chapters} />
        </div>
      </main>
    </div>
  );
}