import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { caseDuration } from '@/lib/case-duration';
import { tournoiPhase, readAnswers, settleExpiredCases, TOURNOI_LATE_GRACE } from '@/lib/tournoi';
import { getTournoiCasePayload } from '@/lib/tournoi-case';

const normalize = (s: string) => s.trim().toLowerCase();

// Réponse d'un finaliste. Aucune correction n'est renvoyée (ni « juste/faux », ni bonne réponse) :
// tout est dévoilé à la clôture du tournoi, pour que personne ne puisse souffler les réponses à ceux qui n'ont pas encore joué.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const tournamentId = typeof body?.tournamentId === 'string' ? body.tournamentId : '';
    const caseId = typeof body?.caseId === 'string' ? body.caseId : '';
    const answer = typeof body?.answer === 'string' ? body.answer.slice(0, 1000) : '';

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
      const t = entry.tournament;
      if (tournoiPhase(t) !== 'EN_COURS') throw new Error('NOT_OPEN');

      // Cas dont le temps est déjà écoulé : réglés d'abord
      await settleExpiredCases(tx, entry.id);
      const fresh = await tx.tournamentEntry.findUnique({ where: { id: entry.id } });
      if (!fresh) throw new Error('NOT_FINALIST');
      if (fresh.finishedAt || fresh.currentIndex >= t.caseIds.length) return { done: true as const, next: null };

      const expected = t.caseIds[fresh.currentIndex];
      if (caseId !== expected) throw new Error('OUT_OF_SYNC'); // l'écran n'est plus à jour (cas déjà réglé par le chrono)
      if (!fresh.caseStartedAt) throw new Error('NOT_STARTED');

      const c = await tx.clinicalCase.findUnique({ where: { id: expected } });
      if (!c) throw new Error('NO_CASE');
      const max = caseDuration(c.difficulty, c.durationMax);
      const elapsed = (Date.now() - fresh.caseStartedAt.getTime()) / 1000;
      const late = elapsed > max + TOURNOI_LATE_GRACE;
      const isCorrect = !late && !!answer && normalize(answer) === normalize(c.correctAnswer);
      const timeSpent = Math.min(max, Math.max(0, Math.round(elapsed)));

      const answers = [...readAnswers(fresh.answers), { caseId: expected, answer: late ? 'Aucune réponse (Temps écoulé)' : answer, isCorrect, timeSpent }];
      const index = fresh.currentIndex + 1;
      const finished = index >= t.caseIds.length;

      await tx.tournamentEntry.update({
        where: { id: fresh.id },
        data: {
          currentIndex: index,
          caseStartedAt: null,
          answers: answers as any,
          score: answers.filter(a => a.isCorrect).length,
          totalTime: answers.reduce((s, a) => s + a.timeSpent, 0),
          ...(finished ? { finishedAt: new Date() } : {}),
        },
      });

      const next = finished ? null : await getTournoiCasePayload(tx, t.caseIds[index]);
      return { done: finished, index, total: t.caseIds.length, next };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    const map: Record<string, [string, number]> = {
      NOT_FINALIST: ["Tu n'es pas finaliste de ce tournoi.", 403],
      NOT_OPEN: ["Ce tournoi n'est pas ouvert en ce moment.", 403],
      OUT_OF_SYNC: ["Ton écran n'était plus à jour. Recharge la page.", 409],
      NOT_STARTED: ["Le chrono de ce cas n'a pas démarré. Recharge la page.", 409],
      NO_CASE: ['Cas introuvable.', 404],
    };
    const known = map[e?.message];
    if (known) return NextResponse.json({ error: known[0] }, { status: known[1] });
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
