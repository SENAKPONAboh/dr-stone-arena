import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { caseDuration } from '@/lib/case-duration';
import { tournoiPhase, settleExpiredCases } from '@/lib/tournoi';

// Le finaliste commence (ou reprend) le cas en cours : le serveur note l'heure de départ.
// Le chrono est donc mesuré côté serveur : fermer puis rouvrir l'application ne redonne pas de temps.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { tournamentId } = await request.json();
    if (typeof tournamentId !== 'string') return NextResponse.json({ error: 'Tournoi invalide' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'tournoi' + tournamentId + user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const entry = await tx.tournamentEntry.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: user.id } },
        include: { tournament: true },
      });
      if (!entry) throw new Error('NOT_FINALIST');
      if (tournoiPhase(entry.tournament) !== 'EN_COURS') throw new Error('NOT_OPEN');

      await settleExpiredCases(tx, entry.id);
      let fresh = await tx.tournamentEntry.findUnique({ where: { id: entry.id } });
      if (!fresh) throw new Error('NOT_FINALIST');
      if (fresh.finishedAt || fresh.currentIndex >= entry.tournament.caseIds.length) return { done: true as const };

      if (!fresh.caseStartedAt) {
        fresh = await tx.tournamentEntry.update({
          where: { id: entry.id },
          data: { caseStartedAt: new Date(), ...(fresh.startedAt ? {} : { startedAt: new Date() }) },
        });
      }

      const c = await tx.clinicalCase.findUnique({ where: { id: entry.tournament.caseIds[fresh.currentIndex] }, select: { difficulty: true, durationMax: true } });
      const max = caseDuration(c?.difficulty, c?.durationMax ?? 60);
      const elapsed = (Date.now() - (fresh.caseStartedAt as Date).getTime()) / 1000;
      return { done: false as const, index: fresh.currentIndex, remaining: Math.max(0, Math.ceil(max - elapsed)) };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.message === 'NOT_FINALIST') return NextResponse.json({ error: "Tu n'es pas finaliste de ce tournoi." }, { status: 403 });
    if (e?.message === 'NOT_OPEN') return NextResponse.json({ error: "Ce tournoi n'est pas ouvert en ce moment." }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
