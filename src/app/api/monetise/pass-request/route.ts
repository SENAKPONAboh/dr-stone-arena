import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { uploadReceipt } from '@/lib/supabase-storage';
import { PASS_PRICE_FCFA } from '@/lib/monetise';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    const paymentMethodIdRaw = formData.get('paymentMethodId');

    // Pas de double demande en attente
    const existingPending = await prisma.passRequest.findFirst({
      where: { userId: user.id, status: 'EN_ATTENTE' }
    });
    if (existingPending) {
      return NextResponse.json({ error: "Tu as déjà une demande de Pass en attente de validation." }, { status: 400 });
    }

    // Validation du fichier
    if (!file) return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image dépasse 4 Mo." }, { status: 400 });
    }

    // Moyen de paiement (optionnel — traçabilité)
    let paymentMethodId: string | null = null;
    if (paymentMethodIdRaw) {
      const method = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodIdRaw.toString() } });
      if (method && method.isActive) paymentMethodId = method.id;
    }

    // Upload Supabase Storage (même bucket que les reçus Premium)
    let receiptPath: string;
    try {
      receiptPath = await uploadReceipt(file, user.id);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Erreur lors du téléversement du reçu." }, { status: 500 });
    }

    await prisma.passRequest.create({
      data: { userId: user.id, receiptUrl: receiptPath, paymentMethodId, status: 'EN_ATTENTE' }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}