import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ===== ACTIVATION DES OBJETS (règle : ACHAT ≠ ACTIVATION) =====
// L'objet n'est consommé ICI que parce que le joueur a cliqué « Utiliser ».
// V1 : objets Flamme (Gel 48 h, Restaure sous 48 h, Assurance 7 jours).

const GEL_DURATION_MS = 48 * 3600 * 1000;   // 48 heures
const ASSURANCE_DURATION_MS = 7 * 24 * 3600 * 1000; // 7 jours
const RESTAURE_WINDOW_MS = 48 * 3600 * 1000; // fenêtre d'utilisation après la perte

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { itemId } = await request.json();
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) return NextResponse.json({ error: "Objet introuvable." }, { status: 404 });
    if (item.category === 'RUSH') return NextResponse.json({ error: "Cet objet s'utilise dans le Rush — intégration en cours (prochaine mise à jour)." }, { status: 400 });
    if (item.category !== 'FLAMME') return NextResponse.json({ error: "Cet objet ne s'active pas ici." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      // 🔒 VERROU best effort (même pattern que les autres routes monétisées)
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      // 1. Stock : l'objet doit être présent dans l'inventaire
      const inv = await tx.userInventory.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
      });
      if (!inv || inv.quantity < 1) throw new Error('NO_STOCK');

      // 2. État frais de la Flamme
      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { streak: true, flameProtectedUntil: true, flameLostAt: true, streakBeforeReset: true },
      });
      if (!fresh) throw new Error('NO_USER');

      const now = new Date();
      const protectionActive = fresh.flameProtectedUntil ? new Date(fresh.flameProtectedUntil) > now : false;

      let message = '';
      const updateData: {
        flameProtectedUntil?: Date;
        streak?: number;
        streakBeforeReset?: number;
        flameLostAt?: Date | null;
        lastActive?: Date;
      } = {};

      if (item.effectKey === 'GEL_FLAMME') {
        if (protectionActive) throw new Error('PROTECTION_ACTIVE');
        const until = new Date(now.getTime() + GEL_DURATION_MS);
        updateData.flameProtectedUntil = until;
        message = `🧊 Flamme gelée 48 h — protégée jusqu'au ${until.toLocaleString('fr-FR')}`;

      } else if (item.effectKey === 'RESTAURE_FLAMME') {
        if (!fresh.flameLostAt || !fresh.streakBeforeReset || fresh.streakBeforeReset < 1) throw new Error('NO_LOSS');
        const lostAt = new Date(fresh.flameLostAt);
        if (now.getTime() - lostAt.getTime() > RESTAURE_WINDOW_MS) throw new Error('LOSS_EXPIRED');
        updateData.streak = fresh.streakBeforeReset;
        updateData.streakBeforeReset = 0;
        updateData.flameLostAt = null;
        updateData.lastActive = now; // la Flamme restaurée s'ancre à aujourd'hui
        message = `🔥 Flamme restaurée : ${fresh.streakBeforeReset} jours !`;

      } else if (item.effectKey === 'ASSURANCE_FLAMME') {
        if (protectionActive) throw new Error('PROTECTION_ACTIVE');
        const until = new Date(now.getTime() + ASSURANCE_DURATION_MS);
        updateData.flameProtectedUntil = until;
        message = `☂️ Assurance active 7 jours — Flamme protégée jusqu'au ${until.toLocaleString('fr-FR')}`;

      } else {
        throw new Error('UNKNOWN_EFFECT');
      }

      // 3. Appliquer l'effet
      await tx.user.update({ where: { id: user.id }, data: updateData });

      // 4. Consommer l'objet (le moment choisi par le joueur — jamais automatique)
      if (inv.quantity <= 1) {
        await tx.userInventory.delete({ where: { userId_itemId: { userId: user.id, itemId: item.id } } });
      } else {
        await tx.userInventory.update({
          where: { userId_itemId: { userId: user.id, itemId: item.id } },
          data: { quantity: { decrement: 1 } },
        });
      }

      return {
        message,
        flameProtectedUntil: updateData.flameProtectedUntil ?? null,
        streak: updateData.streak ?? null,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'NO_STOCK') return NextResponse.json({ error: "Tu n'as pas cet objet en stock." }, { status: 400 });
    if (e?.message === 'PROTECTION_ACTIVE') return NextResponse.json({ error: "Une protection Flamme est déjà active." }, { status: 400 });
    if (e?.message === 'NO_LOSS') return NextResponse.json({ error: "Aucune Flamme perdue à restaurer." }, { status: 400 });
    if (e?.message === 'LOSS_EXPIRED') return NextResponse.json({ error: "Délai dépassé : la perte date de plus de 48 h." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}