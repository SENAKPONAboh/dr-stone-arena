import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const pseudo = formData.get('pseudo') as string;
    const imageFile = formData.get('image') as File;

    let imageUrl = user.imageUrl; // On garde l'ancienne image par défaut

    // Si l'utilisateur a envoyé une nouvelle image
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const filename = `${user.id}-${Date.now()}-${imageFile.name.replace(/\s/g, '')}`;
      
      // Sauvegarder dans le dossier public/avatars
      const uploadDir = path.join(process.cwd(), 'public', 'avatars');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      
      imageUrl = `/avatars/${filename}`;
    }

    // Mettre à jour l'utilisateur dans la base de données
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pseudo: pseudo || null,
        imageUrl: imageUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil." }, { status: 500 });
  }
}