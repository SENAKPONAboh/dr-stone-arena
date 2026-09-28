import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ===== CORRECTION DE SOLDE (ADMIN_CORRECTION) =====
// Opération administrative DIRECTE : créditer ou retirer des UA à n'importe quel compte.
// Règle validée : motif OBLIGATOIRE — chaque correction est inscrite au registre.

const ADMIN_ROLE = 'ADMIN';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const { email, amountUA, note } = await request.json();
    const mail = String(email ?? '').trim().toLowerCase();
    const amount = Number(amountUA);
    const motif = String(note ?? '').trim();

    if (!mail) return NextResponse.json({ error: "Email requis." }, { status: 400 });
    if (!motif) return NextResponse.json({ error: "Motif obligatoire — toute correction doit être justifiée." }, { status: 400 });
    if (!Number.isInteger(amount) || amount === 0) return NextResponse.json({ error: "Montant invalide (entier non nul, positif ou négatif)." }, { status: 400 });
    if (Math.abs(amount) > 10_000_000) return NextResponse.json({ error: "Montant trop élevé (plafond de sécurité : 10 000 000 UA)." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { email: mail }, select: { id: true, prenom: true, nom: true, pseudo: true, uaBalance: true } });
      if (!target) throw new Error('USER_NOT_FOUND');

      // 🔒 Verrou sur le joueur concerné
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${target.id}))`;
      } catch (lockErr) {
        console.error('Verrou advisory indisponible (non bloquant) :', lockErr);
      }

      const newBalance = Math.max(0, target.uaBalance + amount);
      const applied = newBalance - target.uaBalance;
      if (applied === 0) throw new Error('NO_EFFECT');

      const updated = await tx.user.update({
        where: { id: target.id },
        data: { uaBalance: newBalance },
        select: { uaBalance: true },
      });
      await tx.uaTransaction.create({
        data: {
          userId: target.id, type: 'ADMIN_CORRECTION', amount: applied,
          balanceBefore: target.uaBalance, balanceAfter: updated.uaBalance,
        },
      });
      await tx.notification.create({
        data: {
          userId: target.id,
          message: `🛠️ Ton solde a été ajusté : ${applied > 0 ? '+' : ''}${applied.toLocaleString('fr-FR')} UA. Motif : ${motif}`,
          icon: '🛠️',
        },
      });

      return {
        userName: target.pseudo || `${target.prenom} ${target.nom}`,
        applied,
        balanceAfter: updated.uaBalance,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === 'USER_NOT_FOUND') return NextResponse.json({ error: "Aucun compte avec cet email." }, { status: 404 });
    if (e?.message === 'NO_EFFECT') return NextResponse.json({ error: "Aucun effet (le retrait dépasse déjà le solde à 0)." }, { status: 400 });
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}