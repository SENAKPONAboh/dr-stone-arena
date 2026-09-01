import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { MAX_LIVES } from '@/lib/lives';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!user.chestAvailable) {
    return NextResponse.json({ error: "Aucun coffre à ouvrir" }, { status: 400 });
  }

  // Récompense aléatoire : 1 chance sur 2 d'avoir des XP, 1 sur 2 d'avoir une vie
  const reward = Math.random() > 0.5 
    ? { type: 'XP', amount: 50, icon: '⭐', message: '50 XP bonus !' }
    : { type: 'LIFE', amount: 1, icon: '❤️', message: '1 vie gratuite !' };

  if (reward.type === 'XP') {
    await prisma.user.update({
      where: { id: user.id },
      data: { chestAvailable: false, xp: { increment: reward.amount } }
    });
  } else {
    // Plafonnement serveur : le coffre ne peut jamais faire dépasser MAX_LIVES
    const newLives = Math.min(MAX_LIVES, user.lives + reward.amount);
    await prisma.user.update({
      where: { id: user.id },
      data: { chestAvailable: false, lives: newLives }
    });
  }

  return NextResponse.json({ success: true, reward });
}