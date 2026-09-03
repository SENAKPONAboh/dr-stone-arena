import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ARENA_THRESHOLDS } from '@/lib/duel';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { threshold } = await request.json();
    const reward = ARENA_THRESHOLDS.find(t => t.threshold === threshold);
    if (!reward) return NextResponse.json({ error: "Seuil invalide" }, { status: 400 });

    if (user.pointsArena < reward.threshold) {
      return NextResponse.json({ error: "Tu n'as pas encore atteint ce seuil." }, { status: 400 });
    }

    // Unicité userId+threshold en base = impossible de réclamer deux fois
    try {
      await prisma.$transaction([
        prisma.arenaRewardClaim.create({
          data: { userId: user.id, threshold: reward.threshold, xpGranted: reward.xp }
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { xp: { increment: reward.xp } }
        })
      ]);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: "Cette récompense a déjà été réclamée." }, { status: 400 });
      }
      throw e;
    }

    return NextResponse.json({ success: true, message: `${reward.xp} XP gagnés !` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}