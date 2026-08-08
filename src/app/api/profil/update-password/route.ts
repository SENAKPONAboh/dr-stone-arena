import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();

    // 1. Récupérer le vrai mot de passe haché depuis la base de données
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 2. Vérifier l'ancien mot de passe
    const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }

    // 3. Hasher et sauvegarder le nouveau
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}