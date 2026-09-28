import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { RUSH_MAX_ERRORS, RUSH_WEEKEND_CAP_UA, RUSH_PALIER_1_UA, RUSH_PALIER_2_UA, RUSH_PALIER_3_UA, GEL_FLAMME_UA, RESTAURE_FLAMME_UA, getWeekendId } from '@/lib/monetise';
import { isRushWeekend, getWeekendSaturday } from '@/lib/monetise-rush';

const normalizeString = (str: string) => str.trim().toLowerCase();

const PALIERS = [
  { flag: 'palier1' as const, threshold: 10, amount: RUSH_PALIER_1_UA, type: 'RUSH_P1' },
  { flag: 'palier2' as const, threshold: 15, amount: RUSH_PALIER_2_UA, type: 'RUSH_P2' },
  { flag: 'palier3' as const, threshold: 25, amount: RUSH_PALIER_3_UA, type: 'RUSH_P3' },
];

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { sessionId, clinicalCaseId, userAnswer, timeSpent } = await request.json();

    if (!isRushWeekend()) return NextResponse.json({ error: "Le Rush est disponible uniquement samedi et dimanche." }, { status: 400 });
    const weekendId = getWeekendId();

    const clinicalCase = await prisma.clinicalCase.findUnique({ where: { id: clinicalCaseId } });
    if (!clinicalCase) return NextResponse.json({ error: "Cas introuvable" }, { status: 404 });

    const response = await prisma.$transaction(async (tx) => {
      // 🔒 VERROU best effort (voir route semaine)
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const session = await tx.rushSession.findUnique({ where: { id: sessionId } });
      if (!session || session.userId !== user.id) throw new Error('NOT_FOUND');
      if (session.status !== 'EN_COURS') throw new Error('SESSION_CLOSED');
      if (session.weekend !== weekendId) throw new Error('SESSION_CLOSED');
      if (session.playedCaseIds.includes(clinicalCaseId)) throw new Error('CASE_PLAYED');

      const isCorrect = normalizeString(userAnswer) === normalizeString(clinicalCase.correctAnswer);

      const newStreak = isCorrect ? session.currentStreak + 1 : session.currentStreak;
      const newErrors = isCorrect ? session.errors : session.errors + 1;

      const saturday = getWeekendSaturday();
      const weekendAgg = await tx.uaTransaction.aggregate({
        where: { userId: user.id, type: { in: ['RUSH_P1', 'RUSH_P2', 'RUSH_P3'] }, createdAt: { gte: saturday } },
        _sum: { amount: true },
      });
      const totalWeekend = weekendAgg._sum.amount ?? 0;

      const paliersToCredit = isCorrect ? PALIERS.filter(p => newStreak >= p.threshold && !session[p.flag]) : [];

      let sessionStatus: string = 'EN_COURS';
      if (newErrors > RUSH_MAX_ERRORS) sessionStatus = 'TERMINE_ECHEC';
      if (paliersToCredit.some(p => p.flag === 'palier3')) sessionStatus = 'TERMINE_P3';
      if (totalWeekend >= RUSH_WEEKEND_CAP_UA) sessionStatus = 'TERMINE_PLAFOND';

      let totalEarned = 0;
      let balanceAfter: number | null = null;
      let currentTotal = totalWeekend;

      for (const p of paliersToCredit) {
        const effective = Math.max(0, Math.min(p.amount, RUSH_WEEKEND_CAP_UA - currentTotal));
        if (effective <= 0) continue;
        const u = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
        const balanceBefore = u?.uaBalance ?? 0;
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { uaBalance: { increment: effective } },
          select: { uaBalance: true },
        });
        balanceAfter = updated.uaBalance;
        await tx.uaTransaction.create({
          data: { userId: user.id, type: p.type, amount: effective, balanceBefore: balanceBefore, balanceAfter: updated.uaBalance, reference: session.id },
        });
        currentTotal += effective;
        totalEarned += effective;
      }

      if (balanceAfter === null) {
        const u = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
        balanceAfter = u?.uaBalance ?? 0;
      }

      // === COFFRE DU PALIER 3 ===
      let chestGranted = false;
      const chestItems: string[] = [];
      if (paliersToCredit.some(p => p.flag === 'palier3')) {
        const itemsToGrant = [
          { name: 'Gel de Flamme', category: 'FLAMME', priceUA: GEL_FLAMME_UA, icon: '🧊', description: 'Gèle ta Flamme pour la protéger temporairement.' },
          { name: 'Restaure-Flamme', category: 'FLAMME', priceUA: RESTAURE_FLAMME_UA, icon: '🔥', description: 'Restaure une Flamme perdue.' },
        ];
        for (const it of itemsToGrant) {
          let shopItem = await tx.shopItem.findFirst({ where: { name: it.name, category: it.category } });
          if (!shopItem) {
            shopItem = await tx.shopItem.create({
              data: { name: it.name, category: it.category, priceUA: it.priceUA, icon: it.icon, description: it.description },
            });
          }
          await tx.userInventory.upsert({
            where: { userId_itemId: { userId: user.id, itemId: shopItem.id } },
            create: { userId: user.id, itemId: shopItem.id, quantity: 1 },
            update: { quantity: { increment: 1 } },
          });
          chestItems.push(it.name);
        }
        chestGranted = true;
        await tx.uaTransaction.create({
          data: { userId: user.id, type: 'RUSH_COFFRE', amount: 0, balanceBefore: balanceAfter, balanceAfter: balanceAfter, reference: session.id },
        });
      }

      await tx.rushSession.update({
        where: { id: session.id },
        data: {
          currentStreak: newStreak,
          errors: newErrors,
          playedCaseIds: { set: [...session.playedCaseIds, clinicalCaseId] },
          palier1: session.palier1 || paliersToCredit.some(p => p.flag === 'palier1'),
          palier2: session.palier2 || paliersToCredit.some(p => p.flag === 'palier2'),
          palier3: session.palier3 || paliersToCredit.some(p => p.flag === 'palier3'),
          status: sessionStatus,
          finishedAt: sessionStatus !== 'EN_COURS' ? new Date() : null,
        },
      });

      return {
        isCorrect: isCorrect,
        errors: newErrors,
        currentStreak: newStreak,
        maxErrors: RUSH_MAX_ERRORS,
        uaEarned: totalEarned,
        balanceAfter: balanceAfter,
        sessionStatus: sessionStatus,
        explanation: clinicalCase.explanation,
        correctAnswer: clinicalCase.correctAnswer,
        chestGranted: chestGranted,
        chestItems: chestItems,
      };
    });

    return NextResponse.json(response);
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') return NextResponse.json({ error: "Tentative introuvable" }, { status: 404 });
    if (e?.message === 'SESSION_CLOSED') return NextResponse.json({ error: "Cette tentative est terminée ou expirée." }, { status: 400 });
    if (e?.message === 'CASE_PLAYED') return NextResponse.json({ error: "Ce cas a déjà été joué dans cette tentative." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}