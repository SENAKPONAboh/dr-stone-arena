import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import TournoiAdmin from '@/components/admin/TournoiAdmin';
import { seasonLabel } from '@/lib/seasons';
import { tournoiPhase, PHASE_LABEL, readAnswers } from '@/lib/tournoi';

// Prochain samedi 08:00 (heure locale Niger / Bénin) → lundi 08:00, au format du champ « date et heure »
function defaultWindow() {
  const now = new Date(Date.now() + 3600 * 1000); // UTC+1
  let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0));
  while (d.getUTCDay() !== 6 || d.getTime() < now.getTime()) d = new Date(d.getTime() + 86400000);
  const end = new Date(d.getTime() + 48 * 3600 * 1000);
  const f = (x: Date) => x.toISOString().slice(0, 16);
  return { opens: f(d), closes: f(end) };
}

export default async function AdminTournoiPage() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  let ready = true;
  let seasons: { value: string; label: string }[] = [];
  let tournaments: any[] = [];
  try {
    const rows = await prisma.seasonResult.groupBy({ by: ['season'], orderBy: { season: 'desc' }, take: 12 });
    seasons = rows.map(r => ({ value: r.season, label: seasonLabel(r.season) }));
    tournaments = await prisma.tournament.findMany({
      orderBy: { opensAt: 'desc' }, take: 30,
      include: { entries: { orderBy: { seed: 'asc' }, include: { user: { select: { prenom: true, nom: true, pseudo: true } } } } },
    });
  } catch {
    ready = false;
  }

  const now = new Date();
  const list = tournaments.map(t => {
    const phase = tournoiPhase(t, now);
    return {
      id: t.id, title: t.title, status: t.status, phase, phaseLabel: PHASE_LABEL[phase], prize: t.prize,
      opensAt: t.opensAt.toISOString(), closesAt: t.closesAt.toISOString(),
      finalists: t.entries.length,
      finished: t.entries.filter((e: any) => e.finishedAt || readAnswers(e.answers).length >= t.caseIds.length).length,
      casesCount: t.caseIds.length,
      canFinish: phase === 'FERME',
      results: t.status === 'TERMINE'
        ? [...t.entries].sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99)).map((e: any) => ({ name: e.user.pseudo || `${e.user.prenom} ${e.user.nom}`, rank: e.rank, score: e.score, time: e.totalTime }))
        : [],
    };
  });
  const w = defaultWindow();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="border-b-2 border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800" aria-label="Retour">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-extrabold text-gray-800">🏆 Tournoi mensuel</h1>
        </div>
      </header>
      <main className="mx-auto mt-6 max-w-3xl px-4">
        <TournoiAdmin seasons={seasons} tournaments={list} defaultOpens={w.opens} defaultCloses={w.closes} ready={ready} />
      </main>
    </div>
  );
}
