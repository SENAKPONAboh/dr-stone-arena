import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { MAX_LIVES } from '@/lib/lives';

export async function POST() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // 🔒 Ouverture ATOMIQUE : le coffre est « réclamé » en une seule opération en base.
  // Deux requêtes simultanées (double clic, script) ne peuvent pas ouvrir le même coffre deux fois.
  const claimed = await prisma.user.updateMany({
    where: { id: user.id, chestAvailable: true },
    data: { chestAvailable: false },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Aucun coffre à ouvrir" }, { status: 400 });
  }

  // Récompense aléatoire : 1 chance sur 2 d'avoir des XP, 1 sur 2 d'avoir une vie
  const reward = Math.random() > 0.5
    ? { type: 'XP', amount: 50, icon: '⭐', message: '50 XP bonus !' }
    : { type: 'LIFE', amount: 1, icon: '❤️', message: '1 vie gratuite !' };

  if (reward.type === 'XP') {
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: reward.amount } },
    });
  } else {
    // Plafonnement serveur : le coffre ne peut jamais faire dépasser MAX_LIVES (lecture fraîche)
    const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { lives: true } });
    const newLives = Math.min(MAX_LIVES, (fresh?.lives ?? user.lives) + reward.amount);
    await prisma.user.update({
      where: { id: user.id },
      data: { lives: newLives },
    });
  }

  return NextResponse.json({ success: true, reward });
}
