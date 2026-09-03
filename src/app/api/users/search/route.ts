import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      role: 'ETUDIANT',
      statut: 'VALIDE',
      id: { not: user.id },
      OR: [
        { nom: { contains: q, mode: 'insensitive' } },
        { prenom: { contains: q, mode: 'insensitive' } },
        { pseudo: { contains: q, mode: 'insensitive' } }
      ]
    },
    select: {
      id: true, prenom: true, nom: true, pseudo: true, imageUrl: true,
      anneeEtude: true, isPremium: true, duelsWon: true, duelsLost: true
    },
    take: 10
  });

  return NextResponse.json({ users });
}