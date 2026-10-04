import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getNiveauLabel } from '@/lib/niveau';
import { seasonLabel } from '@/lib/seasons';
import { readAnswers } from '@/lib/tournoi';

// Corrections d'un tournoi TERMINÉ : visibles par tous (les cas ne sont plus secrets).
export default async function TournoiCorrectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/api/auth/logout');

  let tournament;
  try {
    tournament = await prisma.tournament.findUnique({ where: { id }, include: { entries: { where: { userId: user.id } } } });
  } catch {
    redirect('/etudiant/tournoi');
  }
  if (!tournament || tournament.status !== 'TERMINE') redirect('/etudiant/tournoi');

  const cases = await prisma.clinicalCase.findMany({ where: { id: { in: tournament.caseIds } } });
  const byId = new Map(cases.map(c => [c.id, c]));
  const mine = readAnswers(tournament.entries[0]?.answers);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="space-y-4">
      <div>
        <Link href="/etudiant/tournoi" className="text-xs font-bold text-mala">← Tournoi</Link>
        <h1 className="mt-1 font-display text-lg font-black text-ink">Corrections · {getNiveauLabel(tournament.anneeEtude)} · {seasonLabel(tournament.season)}</h1>
      </div>

      {tournament.caseIds.map((cid, i) => {
        const c = byId.get(cid);
        if (!c) return null;
        const my = mine.find(a => a.caseId === cid);
        return (
          <section key={cid} className="rounded-3xl border border-line bg-slab p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Cas {i + 1}</p>
            <h2 className="font-display text-base font-extrabold text-ink">{c.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{c.statement}</p>
            <div className="mt-3 space-y-1.5">
              {c.options.map((o, k) => {
                const right = o.trim().toLowerCase() === c.correctAnswer.trim().toLowerCase();
                const chosen = my && my.answer.trim().toLowerCase() === o.trim().toLowerCase();
                return (
                  <p key={k} className={`rounded-xl border px-3 py-2 text-sm ${right ? 'border-mala bg-mala/10 font-bold text-ink' : chosen ? 'border-heart bg-heart/10 text-ink' : 'border-line text-mute'}`}>
                    <b>{letters[k]}.</b> {o} {right && '✓'} {chosen && !right && '← ta réponse'}
                  </p>
                );
              })}
            </div>
            <p className="mt-3 whitespace-pre-line rounded-xl bg-slab-2 p-3 text-sm leading-relaxed text-ink"><b>💡 Explication :</b> {c.explanation}</p>
          </section>
        );
      })}
    </div>
  );
}
