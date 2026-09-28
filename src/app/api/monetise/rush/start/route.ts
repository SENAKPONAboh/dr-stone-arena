import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { getWeekendId, RETRY_RUSH_UA, RUSH_FREE_ATTEMPTS, RUSH_WEEKEND_CAP_UA, RUSH_FLAME_REQUIRED } from '@/lib/monetise';
import { isRushWeekend, getActiveDaysThisWeek, getWeekendSaturday, closeStaleRushSessions } from '@/lib/monetise-rush';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    if (!isRushWeekend()) return NextResponse.json({ error: "Le Rush est disponible uniquement samedi et dimanche." }, { status: 400 });

    const weekendId = getWeekendId();

    const result = await prisma.$transaction(async (tx) => {
      // 🔒 VERROU PAR JOUEUR : une seule opération Rush simultanée pour cet utilisateur.
      // Toute autre requête Rush du même joueur attend la fin de celle-ci → plus de double débit possible.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

      // C8 : clôture des sessions d'un ANCIEN week-end restées en cours
      await closeStaleRushSessions(user.id, tx);

      // Session du week-end courant déjà en cours ? (relecture APRÈS verrou = état garanti frais)
      const existing = await tx.rushSession.findFirst({ where: { userId: user.id, status: 'EN_COURS' } });
      if (existing) throw new Error('SESSION_EXISTS');

      // Plafond week-end (recalculé sous verrou)
      const saturday = getWeekendSaturday();
      const weekendAgg = await tx.uaTransaction.aggregate({
        where: { userId: user.id, type: { in: ['RUSH_P1', 'RUSH_P2', 'RUSH_P3'] }, createdAt: { gte: saturday } },
        _sum: { amount: true },
      });
      if ((weekendAgg._sum.amount ?? 0) >= RUSH_WEEKEND_CAP_UA) throw new Error('CAP_REACHED');

      // Flamme : 5 jours actifs (lundi → vendredi, classique OU monétisé)
      const activeDays = await getActiveDaysThisWeek(user.id);
      const flameOk = activeDays >= RUSH_FLAME_REQUIRED;

      const sessionsCount = await tx.rushSession.count({ where: { userId: user.id, weekend: weekendId } });
      const attemptNumber = sessionsCount + 1;
      const isFree = flameOk && attemptNumber <= RUSH_FREE_ATTEMPTS;

      // Retry direct payant : débit atomique (type RETRY_RUSH, distinct du Ticket de boutique)
      if (!isFree) {
        const u = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
        if (!u || u.uaBalance < RETRY_RUSH_UA) throw new Error('INSUFFICIENT');
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { uaBalance: { decrement: RETRY_RUSH_UA } },
          select: { uaBalance: true },
        });
        await tx.uaTransaction.create({
          data: {
            userId: user.id,
            type: 'RETRY_RUSH',
            amount: -RETRY_RUSH_UA,
            balanceBefore: u.uaBalance,
            balanceAfter: updated.uaBalance,
          },
        });
      }

      const session = await tx.rushSession.create({
        data: {
          userId: user.id,
          weekend: weekendId,
          attemptNumber: attemptNumber,
          wasFree: isFree,
          status: 'EN_COURS',
        },
      });

      return { sessionId: session.id, isFree: isFree };
    });

    return NextResponse.json({ success: true, sessionId: result.sessionId, wasFree: result.isFree }, { status: 201 });
  } catch (e: any) {
    if (e?.message === 'SESSION_EXISTS') return NextResponse.json({ error: "Tu as déjà une tentative en cours." }, { status: 400 });
    if (e?.message === 'INSUFFICIENT') return NextResponse.json({ error: "Solde insuffisant pour lancer une tentative supplémentaire." }, { status: 400 });
    if (e?.message === 'CAP_REACHED') return NextResponse.json({ error: "Récompense Rush maximale atteinte pour ce week-end." }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}