import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { caseDuration } from '@/lib/case-duration';
import { readStoredAnswers } from '@/lib/duel-answers';

// ===== RÉPONSE À UN CAS DE DUEL (une par une) =====
// La bonne réponse et l'explication ne sont révélées qu'APRÈS que la réponse est enregistrée.
// La réponse enregistrée est définitive : la renvoyer ou recharger la page ne permet pas de la changer.
// Le score final (/api/duel/submit) est calculé à partir de ces réponses enregistrées.

const normalizeString = (str: string) => str.trim().toLowerCase();

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await request.json();
    const duelId = String(body?.duelId ?? '');
    const caseId = String(body?.caseId ?? '');
    const answer = String(body?.answer ?? '');
    const clientTime = Number(body?.timeSpent);

    const clinicalCase = await prisma.clinicalCase.findUnique({ where: { id: caseId } });
    if (!clinicalCase) return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });
    const maxTime = caseDuration(clinicalCase.difficulty, clinicalCase.durationMax);
    const timeSpent = Math.max(0, Math.min(maxTime, Number.isFinite(clientTime) ? Math.round(clientTime) : maxTime));

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${duelId + user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const duel = await tx.duel.findUnique({ where: { id: duelId } });
      if (!duel) throw new Error('NOT_FOUND');
      const isRequester = duel.requesterId === user.id;
      const isOpponent = duel.opponentId === user.id;
      if (!isRequester && !isOpponent) throw new Error('FORBIDDEN');
      if (duel.status !== 'ACCEPTE') throw new Error('NOT_PLAYING');
      if (duel.playDeadline && duel.playDeadline < new Date()) throw new Error('DEADLINE');
      if (isRequester ? duel.requesterCompleted : duel.opponentCompleted) throw new Error('COMPLETED');
      if (!duel.caseIds.includes(caseId)) throw new Error('NOT_IN_DUEL');

      const stored = readStoredAnswers(isRequester ? duel.requesterAnswers : duel.opponentAnswers);
      const existing = stored.find(a => a.caseId === caseId);
      if (existing) return { isCorrect: existing.isCorrect };

      const isCorrect = !!answer && normalizeString(answer) === normalizeString(clinicalCase.correctAnswer);
      const next = [...stored, { caseId, answer, isCorrect, timeSpent }];
      await tx.duel.update({
        where: { id: duel.id },
        data: isRequester ? { requesterAnswers: next } : { opponentAnswers: next },
      });
      return { isCorrect };
    });

    return NextResponse.json({
      isCorrect: result.isCorrect,
      correctAnswer: clinicalCase.correctAnswer,
      explanation: clinicalCase.explanation,
    });
  } catch (e: any) {
    const map: Record<string, [string, number]> = {
      NOT_FOUND: ["Duel introuvable", 404],
      FORBIDDEN: ["Ce duel ne te concerne pas.", 403],
      NOT_PLAYING: ["Ce duel n'est pas en cours.", 400],
      DEADLINE: ["Le temps de jeu est écoulé.", 400],
      COMPLETED: ["Tu as déjà terminé ce duel.", 400],
      NOT_IN_DUEL: ["Ce cas ne fait pas partie du duel.", 400],
    };
    const known = map[e?.message];
    if (known) return NextResponse.json({ error: known[0] }, { status: known[1] });
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
