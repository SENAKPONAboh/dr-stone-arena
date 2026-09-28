import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ===== ÉQUIPEMENT DE PERSONNALISATION (règles validées) =====
// Achat → inventaire → Équiper. Un seul élément actif par catégorie.
// PERMANENT : équiper ne consomme JAMAIS l'objet.

const PERSO_CATEGORIES = ['TITRE', 'CADRE', 'THEME'];

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { itemId, action } = await request.json();

    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Objet introuvable." }, { status: 404 });
    if (!PERSO_CATEGORIES.includes(item.category)) {
      return NextResponse.json({ error: "Cet objet ne s'équipe pas ici." }, { status: 400 });
    }
    if (action !== 'EQUIP' && action !== 'UNEQUIP') {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      // Propriété obligatoire (jamais consommé — la quantité reste)
      const inv = await tx.userInventory.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
      });
      if (!inv || inv.quantity < 1) throw new Error('NOT_OWNED');

      const equip = action === 'EQUIP';
      const data: { activeTitleId?: string | null; activeFrameId?: string | null; activeThemeId?: string | null } = {};
      if (item.category === 'TITRE') data.activeTitleId = equip ? item.effectKey : null;
      if (item.category === 'CADRE') data.activeFrameId = equip ? item.effectKey : null;
      if (item.category === 'THEME') data.activeThemeId = equip ? item.effectKey : null;

      await tx.user.update({ where: { id: user.id }, data });

      return { equipped: equip ? item.effectKey : null, name: item.name, category: item.category };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'NOT_OWNED') return NextResponse.json({ error: "Tu ne possèdes pas cet objet." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}