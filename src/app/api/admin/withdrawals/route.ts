import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ⚠️ Hypothèse : le rôle admin vaut 'ADMIN' dans votre base — à confirmer (une ligne à changer sinon)
const ADMIN_ROLE = 'ADMIN';

export async function GET(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where = status === 'PENDING'
    ? { status: { in: ['EN_ATTENTE', 'EN_TRAITEMENT'] } }
    : (!status || status === 'ALL') ? {} : { status };

  const withdrawals = await prisma.withdrawalRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { prenom: true, nom: true, pseudo: true, email: true } } },
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const { withdrawalId, action, note } = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      const wd = await tx.withdrawalRequest.findUnique({ where: { id: withdrawalId } });
      if (!wd) throw new Error('NOT_FOUND');
      if (!['EN_ATTENTE', 'EN_TRAITEMENT'].includes(wd.status)) throw new Error('ALREADY_PROCESSED');

      // 🔒 Verrou sur le joueur concerné
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${wd.userId}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      if (action === 'EN_TRAITEMENT') {
        await tx.withdrawalRequest.update({ where: { id: wd.id }, data: { status: 'EN_TRAITEMENT' } });
        return { status: 'EN_TRAITEMENT' };
      }

      if (action === 'PAYE') {
        // Les UA avaient déjà quitté le solde au blocage : on libère simplement le suivi
        await tx.withdrawalRequest.update({
          where: { id: wd.id },
          data: { status: 'PAYE', processedAt: new Date(), note: note ?? null },
        });
        await tx.user.update({ where: { id: wd.userId }, data: { uaLocked: { decrement: wd.amountUA } } });
        const u = await tx.user.findUnique({ where: { id: wd.userId }, select: { uaBalance: true } });
        await tx.uaTransaction.create({
          data: {
            userId: wd.userId, type: 'RETRAIT_PAYE', amount: 0,
            balanceBefore: u?.uaBalance ?? 0, balanceAfter: u?.uaBalance ?? 0, reference: wd.id,
          },
        });
        await tx.notification.create({
          data: { userId: wd.userId, message: `Ton retrait de ${wd.amountFCFA.toLocaleString('fr-FR')} FCFA a été payé ✅`, icon: '💰' },
        });
        return { status: 'PAYE' };
      }

      if (action === 'REJETE') {
        // Restitution intégrale des UA
        const fresh = await tx.user.findUnique({ where: { id: wd.userId }, select: { uaBalance: true } });
        await tx.withdrawalRequest.update({
          where: { id: wd.id },
          data: { status: 'REJETE', processedAt: new Date(), note: note ?? null },
        });
        const updated = await tx.user.update({
          where: { id: wd.userId },
          data: { uaBalance: { increment: wd.amountUA }, uaLocked: { decrement: wd.amountUA } },
          select: { uaBalance: true },
        });
        await tx.uaTransaction.create({
          data: {
            userId: wd.userId, type: 'RETRAIT_REJETE', amount: wd.amountUA,
            balanceBefore: fresh?.uaBalance ?? 0, balanceAfter: updated.uaBalance, reference: wd.id,
          },
        });
        await tx.notification.create({
          data: {
            userId: wd.userId,
            message: `Ton retrait a été rejeté — ${wd.amountUA.toLocaleString('fr-FR')} UA te sont rendues.${note ? ` Motif : ${note}` : ''}`,
            icon: '❌',
          },
        });
        return { status: 'REJETE' };
      }

      throw new Error('UNKNOWN_ACTION');
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    if (e?.message === 'ALREADY_PROCESSED') return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}