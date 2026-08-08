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

    // Mettre à jour la demande
    await prisma.premiumRequest.update({
      where: { id: requestId },
      data: { status: action }
    });

    // Si validé, passer l'utilisateur en Premium
    if (action === 'VALIDE') {
      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}