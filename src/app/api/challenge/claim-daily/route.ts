import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // 1. Vérifier s'il a déjà réclamé sa récompense aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (user.lastDailyRewardClaimedAt) {
    const lastClaimed = new Date(user.lastDailyRewardClaimedAt);
    lastClaimed.setHours(0, 0, 0, 0);
    if (lastClaimed.getTime() === today.getTime()) {
      return NextResponse.json({ error: "Récompense déjà réclamée aujourd'hui" }, { status: 400 });
    }
  }

  // 2. Compter les cas faits aujourd'hui
  const attemptsToday = await prisma.attempt.count({
    where: {
      userId: user.id,
      createdAt: { gte: today }
    }
  });

  // 3. Vérifier s'il a fait au moins 2 cas
  if (attemptsToday < 2) {
    return NextResponse.json({ error: "Tu n'as pas encore fini ton défi !" }, { status: 400 });
  }

  // 4. Donner la récompense (20 XP)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      xp: { increment: 20 },
      lastDailyRewardClaimedAt: new Date()
    }
  });

  return NextResponse.json({ success: true, message: "20 XP bonus gagnés !" });
}