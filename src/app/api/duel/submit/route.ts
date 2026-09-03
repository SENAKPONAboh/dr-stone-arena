import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { POINTS_PER_WIN } from '@/lib/duel';
import { checkDuelBadges } from '@/lib/duel-server';

const normalizeString = (str: string) => str.trim().toLowerCase();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { duelId, answers, timeSpent } = await request.json();
    if (!duelId || !Array.isArray(answers)) {
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
    const cases = await prisma.clinicalCase.findMany({ where: { id: { in: duel.caseIds } } });
    const answerMap = new Map<string, string>();
    for (const a of answers) {
      if (a && a.caseId) answerMap.set(a.caseId, a.answer ?? '');
    }

    const detailedAnswers = duel.caseIds.map(caseId => {
      const c = cases.find(cc => cc.id === caseId);
      const given = answerMap.get(caseId) ?? '';
      const isCorrect = c ? normalizeString(given) === normalizeString(c.correctAnswer) : false;
      return { caseId, answer: given, isCorrect };
    });
    const score = detailedAnswers.filter(a => a.isCorrect).length;

    const updateData: any = isRequester
      ? { requesterAnswers: detailedAnswers, requesterScore: score, requesterTime: timeSpent, requesterCompleted: true }
      : { opponentAnswers: detailedAnswers, opponentScore: score, opponentTime: timeSpent, opponentCompleted: true };

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

        // Vainqueur : score d'abord, temps total en départage, sinon égalité
        const rs = fresh.requesterScore ?? 0;
        const os = fresh.opponentScore ?? 0;
        if (rs > os) winnerId = fresh.requesterId;
        else if (os > rs) winnerId = fresh.opponentId;
        else {
          const rt = fresh.requesterTime ?? Infinity;
          const ot = fresh.opponentTime ?? Infinity;
          if (rt < ot) winnerId = fresh.requesterId;
          else if (ot < rt) winnerId = fresh.opponentId;
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
        // Notifications de résultat + badges (hors transaction, non critiques)
        await prisma.notification.create({
          data: {
            userId: fresh.requesterId,
            message: winnerId === fresh.requesterId
              ? `Victoire contre ${nameOf(opponent)} ! ⚔️ +${POINTS_PER_WIN} Points Arena`
              : winnerId === null ? `Égalité contre ${nameOf(opponent)}. 🤝`
              : `Défaite contre ${nameOf(opponent)}. ❌`,
            icon: winnerId === fresh.requesterId ? '🏆' : '⚔️'
          }
        });
        await prisma.notification.create({
          data: {
            userId: fresh.opponentId,
            message: winnerId === fresh.opponentId
              ? `Victoire contre ${nameOf(requester)} ! ⚔️ +${POINTS_PER_WIN} Points Arena`
              : winnerId === null ? `Égalité contre ${nameOf(requester)}. 🤝`
              : `Défaite contre ${nameOf(requester)}. ❌`,
            icon: winnerId === fresh.opponentId ? '🏆' : '⚔️'
          }
        });

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