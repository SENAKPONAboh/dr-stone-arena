import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ContentManagerForm from '@/components/admin/ContentManagerForm';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import { getNiveauLabel } from '@/lib/niveau';

export default async function AdminContentPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  const subjects = await prisma.subject.findMany({
    orderBy: [{ anneeEtude: 'asc' }, { name: 'asc' }],
    include: { chapters: { orderBy: { name: 'asc' }, select: { id: true, name: true, _count: { select: { cases: true } } } } },
  });

  // Regrouper les matières par année pour l'affichage
  const subjectsByYear: { [key: number]: typeof subjects } = {};
  subjects.forEach(s => {
    if (!subjectsByYear[s.anneeEtude]) subjectsByYear[s.anneeEtude] = [];
    subjectsByYear[s.anneeEtude].push(s);
  });

  return (
    <div className="min-h-screen pb-12">
      
      <AdminHeader title="Matières et chapitres" subtitle="Le programme et ses cas" icon="layers" tone="mala" />

      <main className="max-w-6xl mx-auto px-4 mt-6">
        
        <div className="adm-card mb-8 p-4 sm:p-6">
          <ContentManagerForm subjects={subjects} />
        </div>

        <h2 className="adm-title mb-4 text-lg">Programme actuel</h2>
        <div className="space-y-6">
          {Object.entries(subjectsByYear).map(([year, subs]) => (
            <section key={year}>
              <h3 className="adm-label mb-2">{getNiveauLabel(Number(year))} · {subs.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c._count.cases, 0), 0).toLocaleString('fr-FR')} cas</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {subs.map(s => {
                  const cases = s.chapters.reduce((m, c) => m + c._count.cases, 0);
                  return (
                    <details key={s.id} className="adm-card group p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-ink">{s.name}</span>
                          <span className="text-xs text-mute">{s.chapters.length} chapitre{s.chapters.length > 1 ? 's' : ''} · {cases} cas</span>
                        </span>
                        <span className="text-mute transition-transform group-open:rotate-90">›</span>
                      </summary>
                      <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                        {s.chapters.length === 0 && <li className="text-mute">Aucun chapitre.</li>}
                        {s.chapters.map(c => (
                          <li key={c.id} className="flex justify-between gap-2">
                            <span className="truncate text-ink">{c.name}</span>
                            <span className={`adm-num flex-shrink-0 text-xs ${c._count.cases ? 'text-mala' : 'text-heart'}`}>{c._count.cases}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </section>
          ))}
          {subjects.length === 0 && <p className="adm-card p-6 text-center text-sm text-mute">Aucune matière pour l'instant.</p>}
        </div>

      </main>
    </div>
  );
}