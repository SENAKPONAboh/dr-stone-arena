// ===== LOGIQUE SERVEUR DES DUELS — ne pas importer depuis un composant client =====
import prisma from '@/lib/prisma';
import { POINTS_PER_WIN } from '@/lib/duel';

// Expiration "paresseuse" (même pattern que l'expiration Premium du dashboard)
export async function expireStaleDuels(userId: string) {
  const now = new Date();

  // 1. Invitations sans réponse depuis + de 24h → EXPIRE (ne compte pas au quota)
  await prisma.duel.updateMany({
    where: { status: 'EN_ATTENTE', expiresAt: { lt: now } },
    data: { status: 'EXPIRE' }
  });

  // 2. Duels acceptés dont le délai de jeu (24h) est dépassé
  const overdue = await prisma.duel.findMany({
    where: {
      status: 'ACCEPTE',
      playDeadline: { lt: now },
      OR: [{ requesterId: userId }, { opponentId: userId }]
    }
  });

  for (const duel of overdue) {
    await prisma.$transaction(async (tx) => {
      // Passage à TERMINE atomique — un seul des deux joueurs peut finaliser
      const updated = await tx.duel.updateMany({
        where: { id: duel.id, status: 'ACCEPTE' },
        data: { status: 'TERMINE', finalizedAt: new Date() }
      });
      if (updated.count === 0) return;

      // Règle validée : celui qui n'a pas joué PERD (quota consommé car accepté).
      // Si aucun n'a joué : duel consommé, sans vainqueur ni stats.
      let winnerId: string | null = null;
      if (duel.requesterCompleted && !duel.opponentCompleted) winnerId = duel.requesterId;
      else if (duel.opponentCompleted && !duel.requesterCompleted) winnerId = duel.opponentId;

      await tx.duel.update({ where: { id: duel.id }, data: { winnerId } });

      if (winnerId) {
        const loserId = winnerId === duel.requesterId ? duel.opponentId : duel.requesterId;
        await tx.user.update({ where: { id: winnerId }, data: { duelsWon: { increment: 1 }, pointsArena: { increment: POINTS_PER_WIN } } });
        await tx.user.update({ where: { id: loserId }, data: { duelsLost: { increment: 1 } } });
        await tx.notification.create({ data: { userId: winnerId, message: "Victoire par forfait : ton adversaire n'a pas joué à temps ! ⚔️", icon: '🏆' } });
        await tx.notification.create({ data: { userId: loserId, message: "Défaite par forfait : tu n'as pas joué ton duel dans les 24h. ❌", icon: '⚔️' } });
      }
    });
  }
}

// Badges de duel — gagnés par performance uniquement, jamais par le Premium
const DUEL_BADGE_RULES: { name: string; played?: number; won?: number }[] = [
  { name: "Premier Duel", played: 1 },
  { name: "Combattant", won: 5 },
  { name: "Rival", won: 10 },
  { name: "Champion Arena", won: 50 },
  { name: "Maître du Duel", won: 100 },
  { name: "Légende Arena", won: 200 },
];

export async function checkDuelBadges(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { duelsWon: true, duelsLost: true } });
  if (!u) return;
  const played = u.duelsWon + u.duelsLost;

  for (const rule of DUEL_BADGE_RULES) {
    const ok = (rule.played !== undefined && played >= rule.played) || (rule.won !== undefined && u.duelsWon >= rule.won);
    if (!ok) continue;
    const badge = await prisma.badge.findFirst({ where: { name: rule.name } });
    if (!badge) continue;
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id }
    });
  }
}