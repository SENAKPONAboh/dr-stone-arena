import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { RUSH_MAX_ERRORS, getWeekendId } from '@/lib/monetise';
import { isRushWeekend } from '@/lib/monetise-rush';
import type { Prisma } from '@prisma/client';

// ===== OBJETS DE RUSH (règle : ACHAT ≠ ACTIVATION — consommation uniquement à l'action du joueur) =====
// BOUCLIER      : absorbe la dernière erreur (elle ne compte pas dans les 3 tolérées) — tentative en cours
// SECONDE_CHANCE: reprend une tentative terminée par ERREURS — 1 seule par tentative
// TEMPS_BONUS   : +30 secondes au chronomètre — tentative en cours

const TIME_BONUS_SECONDS = 30;

async function consumeItem(tx: Prisma.TransactionClient, userId: string, name: string, category: string) {
  const item = await tx.shopItem.findFirst({ where: { name, category } });
  if (!item) throw new Error('ITEM_NOT_FOUND');
  const inv = await tx.userInventory.findUnique({ where: { userId_itemId: { userId, itemId: item.id } } });
  if (!inv || inv.quantity < 1) throw new Error('NO_STOCK');
  if (inv.quantity <= 1) {
    await tx.userInventory.delete({ where: { userId_itemId: { userId, itemId: item.id } } });
  } else {
    await tx.userInventory.update({
      where: { userId_itemId: { userId, itemId: item.id } },
      data: { quantity: { decrement: 1 } },
    });
  }
  return item;
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const { sessionId, action } = await request.json();

    if (!isRushWeekend()) return NextResponse.json({ error: "Le Rush est disponible uniquement samedi et dimanche." }, { status: 400 });
    const weekendId = getWeekendId();

    const result = await prisma.$transaction(async (tx) => {
      // 🔒 VERROU best effort
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const session = await tx.rushSession.findUnique({ where: { id: sessionId } });
      if (!session || session.userId !== user.id) throw new Error('NOT_FOUND');
      if (session.weekend !== weekendId) throw new Error('SESSION_CLOSED');

      // === 🛡️ BOUCLIER : absorber la dernière erreur ===
      if (action === 'BOUCLIER') {
        if (session.status !== 'EN_COURS') throw new Error('SESSION_CLOSED');
        if (session.errors < 1) throw new Error('NO_ERROR');
        await consumeItem(tx, user.id, 'Bouclier', 'RUSH');
        const updated = await tx.rushSession.update({
          where: { id: session.id },
          data: { errors: session.errors - 1 },
        });
        return { action: 'BOUCLIER', errors: updated.errors, maxErrors: RUSH_MAX_ERRORS };
      }

      // === 🔄 SECONDE CHANCE : reprendre après une fin par erreurs ===
      if (action === 'SECONDE_CHANCE') {
        if (session.status !== 'TERMINE_ECHEC') throw new Error('NOT_REVIVABLE');
        // Règle : 1 seule par tentative (marqueur)
        const marker = await tx.uaTransaction.findFirst({
          where: { userId: user.id, type: 'SECONDE_CHANCE', reference: session.id },
        });
        if (marker) throw new Error('ALREADY_REVIVED');
        // Éviter deux tentatives simultanées
        const other = await tx.rushSession.findFirst({
          where: { userId: user.id, status: 'EN_COURS', id: { not: session.id } },
        });
        if (other) throw new Error('OTHER_SESSION');

        await consumeItem(tx, user.id, 'Seconde Chance', 'RUSH');
        const updated = await tx.rushSession.update({
          where: { id: session.id },
          data: { status: 'EN_COURS', errors: RUSH_MAX_ERRORS, finishedAt: null },
        });
        // Marqueur 0 UA (pattern RUSH_COFFRE / TICKET_RUSH) — garantit « 1 seule par tentative »
        const u = await tx.user.findUnique({ where: { id: user.id }, select: { uaBalance: true } });
        await tx.uaTransaction.create({
          data: {
            userId: user.id, type: 'SECONDE_CHANCE', amount: 0,
            balanceBefore: u?.uaBalance ?? 0, balanceAfter: u?.uaBalance ?? 0,
            reference: session.id,
          },
        });
        return { action: 'SECONDE_CHANCE', sessionStatus: updated.status, errors: updated.errors, currentStreak: updated.currentStreak };
      }

      // === ⏱️ TEMPS BONUS : +30 secondes ===
      if (action === 'TEMPS_BONUS') {
        if (session.status !== 'EN_COURS') throw new Error('SESSION_CLOSED');
        await consumeItem(tx, user.id, 'Temps Bonus', 'RUSH');
        return { action: 'TEMPS_BONUS', secondsAdded: TIME_BONUS_SECONDS };
      }

      throw new Error('UNKNOWN_ACTION');
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') return NextResponse.json({ error: "Tentative introuvable" }, { status: 404 });
    if (e?.message === 'SESSION_CLOSED') return NextResponse.json({ error: "Cette tentative est terminée ou expirée." }, { status: 400 });
    if (e?.message === 'NO_ERROR') return NextResponse.json({ error: "Aucune erreur à absorber." }, { status: 400 });
    if (e?.message === 'NO_STOCK') return NextResponse.json({ error: "Tu n'as plus cet objet en stock." }, { status: 400 });
    if (e?.message === 'NOT_REVIVABLE') return NextResponse.json({ error: "La Seconde Chance ne fonctionne que sur une tentative terminée par erreurs." }, { status: 400 });
    if (e?.message === 'ALREADY_REVIVED') return NextResponse.json({ error: "Une seule Seconde Chance par tentative." }, { status: 400 });
    if (e?.message === 'OTHER_SESSION') return NextResponse.json({ error: "Tu as déjà une tentative en cours." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}