import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getNiveauLabel } from '@/lib/niveau';
import { tournoiPhase, TOURNOI_FINALISTS } from '@/lib/tournoi';
import Countdown from './Countdown';

// Carte de l'accueil : met en avant le tournoi pour un finaliste, sinon présente simplement le tournoi mensuel.
export default async function TournoiHomeCard({ userId }: { userId: string }) {
  let entry: any = null;
  try {
    entry = await prisma.tournamentEntry.findFirst({
      where: { userId, tournament: { status: 'PUBLIE' } },
      include: { tournament: true },
      orderBy: { tournament: { opensAt: 'desc' } },
    });
  } catch {
    entry = null; // tables pas encore créées : on affiche la carte simple
  }

  if (entry) {
    const t = entry.tournament;
    const phase = tournoiPhase(t);
    const finished = !!entry.finishedAt || entry.currentIndex >= t.caseIds.length;
    return (
      <Link href="/etudiant/tournoi" className="relative block overflow-hidden rounded-3xl border-2 border-gold/70 bg-gold/10 p-5 shadow-[0_0_28px_rgb(var(--gold-rgb)/0.25)] transition-transform active:scale-[0.98]">
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/10 animate-shimmer" />
        <div className="relative flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold text-gold">Tu es finaliste · {getNiveauLabel(t.anneeEtude)}</p>
            <p className="mt-0.5 text-xs text-ink">
              {phase === 'A_VENIR' && <>Ouvre dans <Countdown to={t.opensAt.toISOString()} className="font-bold" /></>}
              {phase === 'EN_COURS' && !finished && <>À jouer ! Ferme dans <Countdown to={t.closesAt.toISOString()} className="font-bold" /></>}
              {phase === 'EN_COURS' && finished && 'Tu as terminé. Résultats après la clôture.'}
              {phase === 'FERME' && 'Fenêtre fermée, résultats bientôt.'}
            </p>
          </div>
          <span className="font-display text-lg font-extrabold text-gold">→</span>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/etudiant/tournoi" className="block rounded-3xl border border-line bg-slab p-5 transition-transform active:scale-[0.98]">
      <div className="flex items-center gap-4">
        <span className="text-3xl">🏆</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold text-ink">Tournoi mensuel</p>
          <p className="mt-0.5 text-xs text-mute">Les {TOURNOI_FINALISTS} premiers de chaque promotion s'affrontent chaque fin de mois. Vois qui est qualifié.</p>
        </div>
        <span className="font-display text-lg font-extrabold text-mala">→</span>
      </div>
    </Link>
  );
}
