import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const pseudo = formData.get('pseudo') as string;
     const anneeEtude = formData.get('anneeEtude') as string;
    const imageFile = formData.get('image') as File;

    let imageUrl = user.imageUrl; // On garde l'ancienne image par défaut

    // Si l'utilisateur a envoyé une nouvelle image
    if (imageFile && imageFile.size > 0) {
      // Limiter la taille à 2 Mo pour ne pas surcharger la base de données
      if (imageFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "L'image dépasse 2 Mo." }, { status: 400 });
      }
      
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const base64String = buffer.toString('base64');
      // On crée une chaîne de caractères lisible par le navigateur
      const dataUri = `data:${imageFile.type};base64,${base64String}`;
      
      imageUrl = dataUri; // On stocke l'image sous forme de texte
    }

    // Mettre à jour l'utilisateur dans la base de données
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pseudo: pseudo || null,
        imageUrl: imageUrl,
        anneeEtude: anneeEtude ? parseInt(anneeEtude) : user.anneeEtude, // <-- AJOUT
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil." }, { status: 500 });
  }
}