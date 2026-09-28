import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { openChest } from '@/lib/monetise-shop';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { itemId } = await request.json();

    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) return NextResponse.json({ error: "Objet introuvable." }, { status: 404 });
    if (!['FLAMME', 'RUSH', 'COFFRE'].includes(item.category)) {
      return NextResponse.json({ error: "Cette catégorie n'est pas encore disponible." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 🔒 VERROU best effort (même pattern que les autres routes monétisées)
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
      if (!fresh) throw new Error('NO_USER');
      if (fresh.uaBalance < item.priceUA) throw new Error('INSUFFICIENT');

      // Débit atomique + registre ACHAT_BOUTIQUE
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { uaBalance: { decrement: item.priceUA } },
        select: { uaBalance: true },
      });
      await tx.uaTransaction.create({
        data: {
          userId: user.id,
          type: 'ACHAT_BOUTIQUE',
          amount: -item.priceUA,
          balanceBefore: fresh.uaBalance,
          balanceAfter: updated.uaBalance,
          reference: item.id,
        },
      });

      // Coffre → ouverture immédiate (le clic « Ouvrir » EST le moment choisi)
      if (item.category === 'COFFRE') {
        const loot = await openChest(tx, user.id, item.name);
        return { balanceAfter: updated.uaBalance, chestName: item.name, chestIcon: item.icon, loot };
      }

      // Objet → STOCKÉ dans l'inventaire (règle : ACHAT ≠ ACTIVATION, jamais consommé automatiquement)
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
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}