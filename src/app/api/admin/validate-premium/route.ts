import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { requestId, userId, action } = await request.json();

    // Récupérer la demande pour connaître le plan demandé
    const premiumRequest = await prisma.premiumRequest.findUnique({
      where: { id: requestId }
    });

    if (!premiumRequest) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }

    // Mettre à jour la demande
    await prisma.premiumRequest.update({
      where: { id: requestId },
      data: { status: action }
    });

    // Si validé, activer le Premium (plan demandé) pendant 30 jours
    if (action === 'VALIDE') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // +30 jours

      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumTier: premiumRequest.tier ?? 1, // fallback Premium I pour les anciennes demandes sans plan
          premiumExpiresAt: expiryDate
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}