import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { ensureProfile, monthKey, PREMIUM_MONTHLY_UA } from '@/lib/league-profile';

// Coffre Premium du mois : des UA de boutique offertes, une fois par mois, selon le palier Premium actif.
export async function POST() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ETUDIANT') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const amount = user.isPremium && user.premiumTier ? PREMIUM_MONTHLY_UA[user.premiumTier] ?? 0 : 0;
  if (!amount) return NextResponse.json({ error: 'Le coffre du mois est réservé aux membres Premium.' }, { status: 403 });
  try {
    await ensureProfile(user.id);
    const month = monthKey();
    const res = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ua:' + user.id}))`;
      const p = await tx.leagueProfile.findUnique({ where: { userId: user.id } });
      if (!p || p.premiumUaMonth === month) return null;
      await tx.leagueProfile.update({ where: { userId: user.id }, data: { ua: { increment: amount }, premiumUaMonth: month } });
      await tx.uaLedger.create({ data: { userId: user.id, amount, reason: 'PREMIUM', reference: month } });
      return { amount, ua: p.ua + amount };
    });
    if (!res) return NextResponse.json({ error: 'Tu as déjà ouvert ton coffre Premium ce mois-ci.' }, { status: 400 });
    return NextResponse.json({ success: true, ...res });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
