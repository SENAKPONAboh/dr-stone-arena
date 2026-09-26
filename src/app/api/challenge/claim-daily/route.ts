import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // 1. Déjà réclamé aujourd'hui ?
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (user.lastDailyRewardClaimedAt) {
      const lastClaimed = new Date(user.lastDailyRewardClaimedAt);
      lastClaimed.setHours(0, 0, 0, 0);
      if (lastClaimed.getTime() === today.getTime()) {
        return NextResponse.json({ error: "Récompense déjà réclamée aujourd'hui" }, { status: 400 });
      }
    }

    // 2. La sélection du jour (créée par le challenge — existe forcément s'il a joué)
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const selection = await prisma.dailyCaseSelection.findFirst({
      where: { userId: user.id, date: { gte: today, lt: tomorrow } },
    });

    if (!selection || selection.caseIds.length === 0) {
      return NextResponse.json({ error: "Tu n'as pas encore commencé ton défi du jour !" }, { status: 400 });
    }

    // 3. Tous les cas du jour ont-ils été tentés ?
    const attemptsToday = await prisma.attempt.count({
      where: { userId: user.id, clinicalCaseId: { in: selection.caseIds }, createdAt: { gte: today } },
    });

    if (attemptsToday < selection.caseIds.length) {
      return NextResponse.json({ error: `Tu n'as pas encore fini ton défi du jour (${attemptsToday}/${selection.caseIds.length} cas joués) !` }, { status: 400 });
    }

    // 4. Récompense (20 XP)
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: 20 }, lastDailyRewardClaimedAt: new Date() }
    });

    return NextResponse.json({ success: true, message: "20 XP bonus gagnés !" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}