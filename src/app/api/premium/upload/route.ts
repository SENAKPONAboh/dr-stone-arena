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
    const file = formData.get('receipt') as File;
    
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }

    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }

    // Créer un nom de fichier unique
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${user.id}-${Date.now()}-${file.name.replace(/\s/g, '')}`;
    
    // Sauvegarder l'image dans le dossier public/receipts
    const uploadDir = path.join(process.cwd(), 'public', 'receipts');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    // Enregistrer la demande dans la base de données
    const requestRecord = await prisma.premiumRequest.create({
      data: {
        userId: user.id,
        receiptUrl: `/receipts/${filename}`,
        status: 'EN_ATTENTE'
      }
    });

    return NextResponse.json({ success: true, request: requestRecord });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du reçu" }, { status: 500 });
  }
}