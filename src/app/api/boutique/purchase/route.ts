import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ===== BOUTIQUE (accueil) : achat avec les UA de la boutique =====
// Solde LeagueProfile.ua : séparé de l'Espace Élite, jamais retirable. Personnalisation = permanente (un seul exemplaire).
const ALLOWED = ['TITRE', 'CADRE', 'THEME', 'FLAMME'];
const PERMANENT = ['TITRE', 'CADRE', 'THEME'];

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ETUDIANT') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const { itemId } = await request.json();
    const item = await prisma.shopItem.findUnique({ where: { id: String(itemId ?? '') } });
    if (!item || !item.isActive || !ALLOWED.includes(item.category)) return NextResponse.json({ error: 'Objet introuvable.' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ua:' + user.id}))`;
      if (PERMANENT.includes(item.category)) {
        const owned = await tx.userInventory.findUnique({ where: { userId_itemId: { userId: user.id, itemId: item.id } } });
        if (owned) throw new Error('ALREADY_OWNED');
      }
      const p = await tx.leagueProfile.findUnique({ where: { userId: user.id } });
      if (!p || p.ua < item.priceUA) throw new Error('INSUFFICIENT');
      await tx.leagueProfile.update({ where: { userId: user.id }, data: { ua: { decrement: item.priceUA } } });
      await tx.uaLedger.create({ data: { userId: user.id, amount: -item.priceUA, reason: 'ACHAT', reference: item.id } });
      await tx.userInventory.upsert({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
        create: { userId: user.id, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      return { ua: p.ua - item.priceUA, name: item.name };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT') return NextResponse.json({ error: "Pas assez d'UA." }, { status: 400 });
    if (e?.message === 'ALREADY_OWNED') return NextResponse.json({ error: 'Tu possèdes déjà cet objet.' }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
