import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ⚠️ Hypothèse : rôle admin = 'ADMIN' (une ligne à changer sinon)
const ADMIN_ROLE = 'ADMIN';

export async function GET(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const where = !status ? { status: 'EN_ATTENTE' } : status === 'ALL' ? {} : { status };

  const recharges = await prisma.rechargeRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { prenom: true, nom: true, pseudo: true, email: true } },
      paymentMethod: { select: { name: true, icon: true } },
    },
  });

  return NextResponse.json({ recharges });
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const { rechargeId, action, note } = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      // 🔒 Verrou sur la demande AVANT de lire son statut : deux clics simultanés
      // ne peuvent plus créditer deux fois la même recharge.
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'rc:' + String(rechargeId)}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }
      const rc = await tx.rechargeRequest.findUnique({ where: { id: rechargeId } });
      if (!rc) throw new Error('NOT_FOUND');

      // 🔒 IDEMPOTENCE VERROUILLÉE : seule une demande EN_ATTENTE peut être traitée.
      // Double-clic, requête réseau répétée ou rejeu → refus catégorique.
      // Un crédit ne peut JAMAIS survenir deux fois pour la même demande.
      if (rc.status !== 'EN_ATTENTE') throw new Error('ALREADY_PROCESSED');

      // Verrou sur le joueur concerné
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rc.userId}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      if (action === 'VALIDE') {
        const fresh = await tx.user.findUnique({ where: { id: rc.userId }, select: { uaBalance: true } });
        if (!fresh) throw new Error('NO_USER');

        await tx.rechargeRequest.update({
          where: { id: rc.id },
          data: { status: 'VALIDE', validatedAt: new Date(), note: note ?? null },
        });
        const updated = await tx.user.update({
          where: { id: rc.userId },
          data: { uaBalance: { increment: rc.amountUA }, uaRecharged: { increment: rc.amountUA } },
          select: { uaBalance: true },
        });
        await tx.uaTransaction.create({
          data: {
            userId: rc.userId, type: 'RECHARGE', amount: rc.amountUA, rechargedDelta: rc.amountUA,
            balanceBefore: fresh.uaBalance, balanceAfter: updated.uaBalance, reference: rc.id,
          },
        });
        await tx.notification.create({
          data: { userId: rc.userId, message: `⚡ Recharge validée : +${rc.amountUA.toLocaleString('fr-FR')} UA créditées !`, icon: '⚡' },
        });
        return { status: 'VALIDE', balanceAfter: updated.uaBalance };
      }

      if (action === 'REJETE') {
        await tx.rechargeRequest.update({
          where: { id: rc.id },
          data: { status: 'REJETE', validatedAt: new Date(), note: note ?? null },
        });
        await tx.notification.create({
          data: { userId: rc.userId, message: `❌ Ta demande de recharge a été rejetée.${note ? ` Motif : ${note}` : ''}`, icon: '❌' },
        });
        return { status: 'REJETE' };
      }

      throw new Error('UNKNOWN_ACTION');
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    if (e?.message === 'ALREADY_PROCESSED') return NextResponse.json({ error: "Cette demande a déjà été traitée — impossible de la créditer deux fois." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}