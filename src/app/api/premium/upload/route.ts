import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }

    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }

    // Limiter la taille à 4 Mo pour les reçus
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image dépasse 4 Mo." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64String = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64String}`;

    // Enregistrer la demande dans la base de données
    const requestRecord = await prisma.premiumRequest.create({
      data: {
        userId: user.id,
        receiptUrl: dataUri, // On stocke l'image sous forme de texte
        status: 'EN_ATTENTE'
      }
    });

    return NextResponse.json({ success: true, request: requestRecord });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du reçu" }, { status: 500 });
  }
}