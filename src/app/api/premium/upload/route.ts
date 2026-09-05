import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PREMIUM_PLANS } from '@/lib/premium';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    const tierRaw = formData.get('tier');
    const paymentMethodIdRaw = formData.get('paymentMethodId');

    // ===== Validation du plan =====
    const tier = tierRaw ? parseInt(tierRaw as string) : null;
    if (tier !== 1 && tier !== 2 && tier !== 3) {
      return NextResponse.json({ error: "Plan Premium invalide" }, { status: 400 });
    }

    // ===== Montant calculé UNIQUEMENT côté serveur (source unique) =====
    const plan = PREMIUM_PLANS.find(p => p.tier === tier);
    if (!plan) {
      return NextResponse.json({ error: "Plan Premium introuvable" }, { status: 400 });
    }

    // ===== Validation du moyen de paiement =====
    const paymentMethodId = paymentMethodIdRaw ? paymentMethodIdRaw.toString() : null;
    if (!paymentMethodId) {
      return NextResponse.json({ error: "Moyen de paiement manquant" }, { status: 400 });
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    });
    if (!paymentMethod) {
      return NextResponse.json({ error: "Moyen de paiement introuvable" }, { status: 400 });
    }
    if (!paymentMethod.isActive) {
      return NextResponse.json({ error: "Ce moyen de paiement n'est plus disponible" }, { status: 400 });
    }
    if (!paymentMethod.isManual) {
      // Les moyens automatisés (carte) passeront par leur propre flux plus tard
      return NextResponse.json({ error: "Ce moyen de paiement ne nécessite pas de reçu manuel" }, { status: 400 });
    }

    // ===== Pas de double demande en attente =====
    const existingPending = await prisma.premiumRequest.findFirst({
      where: { userId: user.id, status: 'EN_ATTENTE' }
    });
    if (existingPending) {
      return NextResponse.json({ error: "Tu as déjà une demande en attente de validation." }, { status: 400 });
    }

    // ===== Validation du fichier =====
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image dépasse 4 Mo." }, { status: 400 });
    }

    // (Stockage — base64 pour l'instant ; Supabase Storage à l'Étape 4)
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64String = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64String}`;

    // ===== Enregistrement de la demande complète =====
    const requestRecord = await prisma.premiumRequest.create({
      data: {
        userId: user.id,
        receiptUrl: dataUri,
        tier: tier,
        paymentMethodId: paymentMethodId,
        amount: plan.price, // snapshot serveur du montant
        status: 'EN_ATTENTE'
      }
    });

    return NextResponse.json({ success: true, request: { id: requestRecord.id } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du reçu" }, { status: 500 });
  }
}