import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NIVEAU_OPTIONS } from '@/lib/niveau';

// Photo de profil : on la réduit à 256×256 (WebP) avant de la stocker.
// Sans ça, une photo de 2 Mo était enregistrée telle quelle et rechargée par TOUTES les pages de classement.
async function compressAvatar(buffer: Buffer): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;
    const out = await sharp(buffer, { failOn: 'none' })
      .rotate() // respecte l'orientation des photos de téléphone
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
    return `data:image/webp;base64,${out.toString('base64')}`;
  } catch (e) {
    console.error('Compression avatar impossible', e);
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const pseudoRaw = formData.get('pseudo');
    const anneeRaw = formData.get('anneeEtude');
    const imageFile = formData.get('image');

    // ===== Pseudo =====
    const pseudo = typeof pseudoRaw === 'string' ? pseudoRaw.trim() : '';
    if (pseudo) {
      if (!/^[\p{L}\p{N} ._'-]{2,30}$/u.test(pseudo)) {
        return NextResponse.json({ error: "Pseudo invalide : 2 à 30 caractères (lettres, chiffres, espace, . _ - ')." }, { status: 400 });
      }
      const taken = await prisma.user.findFirst({
        where: { pseudo: { equals: pseudo, mode: 'insensitive' }, id: { not: user.id } },
        select: { id: true },
      });
      if (taken) return NextResponse.json({ error: "Ce pseudo est déjà pris." }, { status: 400 });
    }

    // ===== Niveau d'étude : uniquement une valeur existante (1 à 7) =====
    let anneeEtude = user.anneeEtude;
    if (typeof anneeRaw === 'string' && anneeRaw !== '') {
      const n = Number.parseInt(anneeRaw, 10);
      if (!NIVEAU_OPTIONS.some(o => o.value === n)) {
        return NextResponse.json({ error: "Niveau d'étude invalide." }, { status: 400 });
      }
      anneeEtude = n;
    }

    // ===== Photo =====
    let imageUrl = user.imageUrl; // On garde l'ancienne image par défaut
    if (imageFile instanceof File && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
      }
      if (imageFile.size > 6 * 1024 * 1024) {
        return NextResponse.json({ error: "L'image dépasse 6 Mo." }, { status: 400 });
      }
      const compressed = await compressAvatar(Buffer.from(await imageFile.arrayBuffer()));
      if (!compressed) {
        return NextResponse.json({ error: "Image illisible. Essaie une photo au format JPG ou PNG." }, { status: 400 });
      }
      imageUrl = compressed;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pseudo: pseudo || null, imageUrl, anneeEtude },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil." }, { status: 500 });
  }
}
