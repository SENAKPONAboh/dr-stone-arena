import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// Ouverture du coffre de ligue en attente : les UA passent dans le solde de la boutique (jamais retirables).
export async function POST() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const opened = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ua:' + user.id}))`;
      const p = await tx.leagueProfile.findUnique({ where: { userId: user.id } });
      if (!p || p.chestUa <= 0) return null;
      await tx.leagueProfile.update({ where: { userId: user.id }, data: { ua: { increment: p.chestUa }, chestUa: 0, chestLabel: null } });
      await tx.uaLedger.create({ data: { userId: user.id, amount: p.chestUa, reason: 'COFFRE', reference: p.chestLabel } });
      return { amount: p.chestUa, label: p.chestLabel, ua: p.ua + p.chestUa };
    });
    if (!opened) return NextResponse.json({ error: 'Aucun coffre à ouvrir.' }, { status: 400 });
    return NextResponse.json({ success: true, ...opened });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
