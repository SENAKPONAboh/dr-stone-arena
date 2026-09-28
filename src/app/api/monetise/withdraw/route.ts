import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { WITHDRAWAL_MIN_UA, uaToFCFA } from '@/lib/monetise';

const OPERATORS = ['ORANGE_MONEY', 'MOOV_MONEY'];

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const body = await request.json();
    const action = body?.action;

    // ===== CRÉATION d'une demande de retrait =====
    if (action === 'CREATE') {
      const amountUA = Number(body?.amountUA);
      const operator = String(body?.operator ?? '');
      const phoneNumber = String(body?.phoneNumber ?? '').trim();
      const accountName = body?.accountName ? String(body.accountName).trim() : null;

      if (!Number.isInteger(amountUA) || amountUA < WITHDRAWAL_MIN_UA) {
        return NextResponse.json({ error: `Le retrait minimum est de ${WITHDRAWAL_MIN_UA.toLocaleString('fr-FR')} UA (= 2 000 FCFA).` }, { status: 400 });
      }
      if (amountUA % 100 !== 0) {
        return NextResponse.json({ error: "Le montant doit être un multiple de 100 UA (100 UA = 1 FCFA)." }, { status: 400 });
      }
      if (!OPERATORS.includes(operator)) {
        return NextResponse.json({ error: "Opérateur invalide." }, { status: 400 });
      }
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) {
        return NextResponse.json({ error: "Numéro de téléphone invalide (8 à 15 chiffres)." }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
        } catch (lockErr) {
          console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
        }

        const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
        if (!fresh) throw new Error('NO_USER');
        if (fresh.uaBalance < amountUA) throw new Error('INSUFFICIENT');

        const active = await tx.withdrawalRequest.findFirst({
          where: { userId: user.id, status: { in: ['EN_ATTENTE', 'EN_TRAITEMENT'] } },
        });
        if (active) throw new Error('ALREADY_PENDING');

        const amountFCFA = uaToFCFA(amountUA);

        // 1. Demande
        const wd = await tx.withdrawalRequest.create({
          data: {
            userId: user.id, amountUA, amountFCFA, operator,
            phoneNumber: digits, accountName, status: 'EN_ATTENTE',
          },
        });
        // 2. Blocage des UA (retirées du solde disponible, suivies dans uaLocked)
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { uaBalance: { decrement: amountUA }, uaLocked: { increment: amountUA } },
          select: { uaBalance: true },
        });
        // 3. Registre
        await tx.uaTransaction.create({
          data: {
            userId: user.id, type: 'RETRAIT_BLOCAGE', amount: -amountUA,
            balanceBefore: fresh.uaBalance, balanceAfter: updated.uaBalance, reference: wd.id,
          },
        });

        return { requestId: wd.id, amountUA, amountFCFA, balanceAfter: updated.uaBalance };
      });

      return NextResponse.json({ success: true, ...result });
    }

    // ===== ANNULATION par l'étudiant (uniquement si EN_ATTENTE) =====
    if (action === 'CANCEL') {
      const requestId = String(body?.requestId ?? '');

      const result = await prisma.$transaction(async (tx) => {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
        } catch (lockErr) {
          console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
        }

        const wd = await tx.withdrawalRequest.findUnique({ where: { id: requestId } });
        if (!wd || wd.userId !== user.id) throw new Error('NOT_FOUND');
        if (wd.status !== 'EN_ATTENTE') throw new Error('NOT_CANCELLABLE');

        const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
        if (!fresh) throw new Error('NO_USER');

        await tx.withdrawalRequest.update({
          where: { id: wd.id },
          data: { status: 'ANNULE', processedAt: new Date() },
        });
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { uaBalance: { increment: wd.amountUA }, uaLocked: { decrement: wd.amountUA } },
          select: { uaBalance: true },
        });
        await tx.uaTransaction.create({
          data: {
            userId: user.id, type: 'RETRAIT_ANNUL', amount: wd.amountUA,
            balanceBefore: fresh.uaBalance, balanceAfter: updated.uaBalance, reference: wd.id,
          },
        });
        return { balanceAfter: updated.uaBalance };
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT') return NextResponse.json({ error: "Solde insuffisant pour ce montant." }, { status: 400 });
    if (e?.message === 'ALREADY_PENDING') return NextResponse.json({ error: "Tu as déjà une demande de retrait en cours." }, { status: 400 });
    if (e?.message === 'NOT_FOUND') return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    if (e?.message === 'NOT_CANCELLABLE') return NextResponse.json({ error: "Ta demande est déjà en traitement — contacte l'équipe." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}