import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const pseudo = formData.get('pseudo') as string;
    const imageUrl = formData.get('imageUrl') as string;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pseudo: pseudo || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.redirect(new URL('/etudiant/profil', request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}