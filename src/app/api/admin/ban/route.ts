import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { userId, action } = await request.json(); // action = 'BANNI' ou 'VALIDE'
    
    await prisma.user.update({
      where: { id: userId },
      data: { statut: action }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}