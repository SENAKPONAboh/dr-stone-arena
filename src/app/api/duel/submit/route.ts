import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { POINTS_PER_WIN } from '@/lib/duel';
import { checkDuelBadges } from '@/lib/duel-server';
import { notifyUser } from '@/lib/notify';
import { readStoredAnswers } from '@/lib/duel-answers';
import { caseDuration } from '@/lib/case-duration';

const normalizeString = (str: string) => str.trim().toLowerCase();

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { duelId, answers } = await request.json();
    if (!duelId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const duel = await prisma.duel.findUnique({ where: { id: duelId } });
    if (!duel) return NextResponse.json({ error: "Duel introuvable" }, { status: 404 });

    const isRequester = duel.requesterId === user.id;
    const isOpponent = duel.opponentId === user.id;
    if (!isRequester && !isOpponent) {
      return NextResponse.json({ error: "Ce duel ne te concerne pas." }, { status: 403 });
    }
    if (duel.status !== 'ACCEPTE') {
      return NextResponse.json({ error: "Ce duel n'est pas en cours." }, { status: 400 });
    }
    if (duel.playDeadline && duel.playDeadline < new Date()) {
      return NextResponse.json({ error: "Le temps de jeu est écoulé." }, { status: 400 });
    }

    const alreadyCompleted = isRequester ? duel.requesterCompleted : duel.opponentCompleted;
    if (alreadyCompleted) return NextResponse.json({ error: "Tu as déjà joué ce duel." }, { status: 400 });

    // ===== Score calculé UNIQUEMENT côté serveur =====
    // Source de vérité : les réponses enregistrées une par une (/api/duel/answer).
    // Repli (ancienne version de l'écran encore ouverte) : les réponses envoyées maintenant.
    const stored = readStoredAnswers(isRequester ? duel.requesterAnswers : duel.opponentAnswers);
    const cases = await prisma.clinicalCase.findMany({ where: { id: { in: duel.caseIds } } });
    const answerMap = new Map<string, string>();
    if (stored.length === 0) {
      for (const a of (Array.isArray(answers) ? answers : [])) {
        if (a && a.caseId) answerMap.set(a.caseId, a.answer ?? '');
      }
    }

    const detailedAnswers = duel.caseIds.map(caseId => {
      const saved = stored.find(s => s.caseId === caseId);
      if (saved) return { caseId, answer: saved.answer, isCorrect: saved.isCorrect, timeSpent: saved.timeSpent };
      const c = cases.find(cc => cc.id === caseId);
      const given = answerMap.get(caseId) ?? '';
      const isCorrect = c ? normalizeString(given) === normalizeString(c.correctAnswer) : false;
      return { caseId, answer: given, isCorrect, timeSpent: 0 };
    });
    const score = detailedAnswers.filter(a => a.isCorrect).length;
    // Temps total : celui mesuré cas par cas côté serveur quand il existe (borné à la durée du cas)
    // Repli (réponses non enregistrées une par une) : le temps envoyé par le téléphone n'est PAS cru
    // (un tricheur pouvait envoyer « 0 seconde » pour gagner les égalités) → on compte le temps maximal des cas.
    const serverTime = stored.reduce((sum, a) => sum + a.timeSpent, 0);
    const fallbackTime = cases.reduce((sum, c) => sum + caseDuration(c.difficulty, c.durationMax), 0);
    const totalTime = stored.length > 0 ? serverTime : fallbackTime;

    const updateData: any = isRequester
      ? { requesterAnswers: detailedAnswers, requesterScore: score, requesterTime: totalTime, requesterCompleted: true, requesterCompletedAt: new Date() }
      : { opponentAnswers: detailedAnswers, opponentScore: score, opponentTime: totalTime, opponentCompleted: true, opponentCompletedAt: new Date() };

    await prisma.duel.update({ where: { id: duel.id }, data: updateData });

    // ===== Finalisation si les deux ont joué — TRANSACTION ANTI-DOUBLE-COMPTAGE =====
    const fresh = await prisma.duel.findUnique({ where: { id: duel.id } });
    if (fresh && fresh.requesterCompleted && fresh.opponentCompleted && fresh.status === 'ACCEPTE') {

      const [requester, opponent] = await Promise.all([
        prisma.user.findUnique({ where: { id: fresh.requesterId }, select: { prenom: true, nom: true, pseudo: true } }),
        prisma.user.findUnique({ where: { id: fresh.opponentId }, select: { prenom: true, nom: true, pseudo: true } })
      ]);
      const nameOf = (u: any) => u?.pseudo || `${u?.prenom} ${u?.nom}`;

      let winnerId: string | null = null;
      let wasFinalized = false;

      await prisma.$transaction(async (tx) => {
        // updateMany atomique : si le statut a changé, count = 0 → déjà finalisé
        const updated = await tx.duel.updateMany({
          where: { id: duel.id, status: 'ACCEPTE' },
          data: { status: 'TERMINE', finalizedAt: new Date() }
        });
        if (updated.count === 0) return;
        wasFinalized = true;

        // Vainqueur : 1) score  2) temps total  3) premier à avoir terminé (zéro-égalité garanti)
        const rs = fresh.requesterScore ?? 0;
        const os = fresh.opponentScore ?? 0;
        if (rs > os) winnerId = fresh.requesterId;
        else if (os > rs) winnerId = fresh.opponentId;
        else {
          const rt = fresh.requesterTime ?? Infinity;
          const ot = fresh.opponentTime ?? Infinity;
          if (rt < ot) winnerId = fresh.requesterId;
          else if (ot < rt) winnerId = fresh.opponentId;
          else {
            const rct = fresh.requesterCompletedAt?.getTime() ?? Infinity;
            const oct = fresh.opponentCompletedAt?.getTime() ?? Infinity;
            if (rct < oct) winnerId = fresh.requesterId;
            else if (oct < rct) winnerId = fresh.opponentId;
          }
        }

        await tx.duel.update({ where: { id: duel.id }, data: { winnerId } });

        if (winnerId === fresh.requesterId) {
          await tx.user.update({ where: { id: fresh.requesterId }, data: { duelsWon: { increment: 1 }, pointsArena: { increment: POINTS_PER_WIN } } });
          await tx.user.update({ where: { id: fresh.opponentId }, data: { duelsLost: { increment: 1 } } });
        } else if (winnerId === fresh.opponentId) {
          await tx.user.update({ where: { id: fresh.opponentId }, data: { duelsWon: { increment: 1 }, pointsArena: { increment: POINTS_PER_WIN } } });
          await tx.user.update({ where: { id: fresh.requesterId }, data: { duelsLost: { increment: 1 } } });
        }
      });

      if (wasFinalized) {
        // Notifications de résultat (cloche + téléphone) + badges (hors transaction, non critiques)
        await notifyUser(fresh.requesterId,
          winnerId === fresh.requesterId
            ? `Victoire contre ${nameOf(opponent)} ! ⚔️ +${POINTS_PER_WIN} Points Arena`
            : winnerId === null ? `Égalité contre ${nameOf(opponent)}. 🤝`
            : `Défaite contre ${nameOf(opponent)}. ❌`,
          winnerId === fresh.requesterId ? '🏆' : '⚔️', { url: `/etudiant/duel/${duel.id}` });
        await notifyUser(fresh.opponentId,
          winnerId === fresh.opponentId
            ? `Victoire contre ${nameOf(requester)} ! ⚔️ +${POINTS_PER_WIN} Points Arena`
            : winnerId === null ? `Égalité contre ${nameOf(requester)}. 🤝`
            : `Défaite contre ${nameOf(requester)}. ❌`,
          winnerId === fresh.opponentId ? '🏆' : '⚔️', { url: `/etudiant/duel/${duel.id}` });

        await checkDuelBadges(fresh.requesterId);
        await checkDuelBadges(fresh.opponentId);
      }
    }

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}