import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// Enregistre un versement et bascule TOUTES les commissions EN_ATTENTE en PAYÉES
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ambassadorId, amount, note } = body;

    if (!ambassadorId) return NextResponse.json({ error: "Ambassadeur manquant." }, { status: 400 });
    const amountValue = parseInt(amount);
    if (!amountValue || amountValue <= 0) {
      return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    }

    const ambassador = await prisma.ambassador.findUnique({ where: { id: ambassadorId } });
    if (!ambassador) return NextResponse.json({ error: "Ambassadeur introuvable." }, { status: 404 });

    const paidAt = new Date();
    await prisma.$transaction([
      prisma.ambassadorPayout.create({
        data: { ambassadorId, amount: amountValue, note: note || null, paidAt }
      }),
      // Toutes les commissions en attente passent en PAYÉES (avec date de versement)
      prisma.ambassadorCommission.updateMany({
        where: { ambassadorId, status: 'EN_ATTENTE' },
        data: { status: 'PAYEE', paidAt }
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}