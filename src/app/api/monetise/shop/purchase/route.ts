import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { openChest } from '@/lib/monetise-shop';

const ALLOWED_CATEGORIES = ['FLAMME', 'RUSH', 'COFFRE', 'TITRE', 'CADRE', 'THEME'];
const PERMANENT_CATEGORIES = ['TITRE', 'CADRE', 'THEME']; // jamais consommés, un seul exemplaire

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { itemId } = await request.json();

    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) return NextResponse.json({ error: "Objet introuvable." }, { status: 404 });
    if (!ALLOWED_CATEGORIES.includes(item.category)) {
      return NextResponse.json({ error: "Cette catégorie n'est pas encore disponible." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      // Objets de personnalisation : PERMANENTS — impossible d'acheter deux fois le même
      if (PERMANENT_CATEGORIES.includes(item.category)) {
        const owned = await tx.userInventory.findUnique({
          where: { userId_itemId: { userId: user.id, itemId: item.id } },
        });
        if (owned) throw new Error('ALREADY_OWNED');
      }

      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
      if (!fresh) throw new Error('NO_USER');
      if (fresh.uaBalance < item.priceUA) throw new Error('INSUFFICIENT');

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { uaBalance: { decrement: item.priceUA } },
        select: { uaBalance: true },
      });
      await tx.uaTransaction.create({
        data: {
          userId: user.id, type: 'ACHAT_BOUTIQUE', amount: -item.priceUA,
          balanceBefore: fresh.uaBalance, balanceAfter: updated.uaBalance, reference: item.id,
        },
      });

      if (item.category === 'COFFRE') {
        const loot = await openChest(tx, user.id, item.name);
        return { balanceAfter: updated.uaBalance, chestName: item.name, chestIcon: item.icon, loot };
      }

      await tx.userInventory.upsert({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
        create: { userId: user.id, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });

      return { balanceAfter: updated.uaBalance, itemName: item.name, loot: null };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT') return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });
    if (e?.message === 'ALREADY_OWNED') return NextResponse.json({ error: "Tu possèdes déjà cet objet — les éléments de personnalisation sont permanents." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}