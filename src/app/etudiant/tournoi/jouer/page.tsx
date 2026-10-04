import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { tournoiPhase, settleExpiredCases } from '@/lib/tournoi';
import { getTournoiCasePayload } from '@/lib/tournoi-case';
import { getNiveauLabel } from '@/lib/niveau';
import { seasonLabel } from '@/lib/seasons';
import TournoiPlayClient from '@/components/tournoi/TournoiPlayClient';

export default async function TournoiJouerPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');

  let entry;
  try {
    entry = await prisma.tournamentEntry.findFirst({
      where: { userId: user.id, tournament: { status: 'PUBLIE' } },
      include: { tournament: true },
      orderBy: { tournament: { opensAt: 'desc' } },
    });
  } catch {
    redirect('/etudiant/tournoi');
  }
  if (!entry) redirect('/etudiant/tournoi');
  if (tournoiPhase(entry.tournament) !== 'EN_COURS') redirect('/etudiant/tournoi');

  // Cas dont le temps est déjà écoulé (application fermée en plein cas) : réglés avant d'afficher
  await prisma.$transaction(tx => settleExpiredCases(tx, entry!.id));
  const fresh = await prisma.tournamentEntry.findUnique({ where: { id: entry.id } });
  const t = entry.tournament;
  const total = t.caseIds.length;
  const done = !fresh || !!fresh.finishedAt || fresh.currentIndex >= total;

  const payload = done ? null : await getTournoiCasePayload(prisma, t.caseIds[fresh!.currentIndex]);
  const closesAtLabel = t.closesAt.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });

  return (
    <TournoiPlayClient
      tournamentId={t.id}
      title={`Tournoi ${getNiveauLabel(t.anneeEtude)} · ${seasonLabel(t.season)}`}
      total={total}
      initialIndex={fresh?.currentIndex ?? 0}
      initialCase={payload}
      closesAtLabel={closesAtLabel}
      startDone={done}
    />
  );
}
