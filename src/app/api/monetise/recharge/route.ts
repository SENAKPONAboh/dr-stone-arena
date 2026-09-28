import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { uaToFCFA, RECHARGE_MIN_UA, RECHARGE_STEP_UA } from '@/lib/monetise';
import { uploadReceipt } from '@/lib/supabase-storage';

// ===== DEMANDE DE RECHARGE (pattern identique au Pass) =====
// Règle validée : l'envoi du reçu ne crédite AUCUNE UA.
// Seule la validation admin (api/admin/recharges) crédite le compte.
// Montant : minimum 10 000 UA (100 FCFA), multiples de 10 000 UA, pas de maximum fixe.

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!user.passActive) return NextResponse.json({ error: "Pass Monétisé requis." }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    const amountUA = parseInt((formData.get('amountUA') as string) ?? '', 10);
    const paymentMethodId = formData.get('paymentMethodId')?.toString() ?? null;

    // ===== Validation du montant (règles validées) =====
    if (!Number.isInteger(amountUA) || amountUA < RECHARGE_MIN_UA) {
      return NextResponse.json({ error: `La recharge minimum est de ${RECHARGE_MIN_UA.toLocaleString('fr-FR')} UA (= 100 FCFA).` }, { status: 400 });
    }
    if (amountUA % RECHARGE_STEP_UA !== 0) {
      return NextResponse.json({ error: `Le montant doit être un multiple de ${RECHARGE_STEP_UA.toLocaleString('fr-FR')} UA (10 000 UA = 100 FCFA).` }, { status: 400 });
    }

    // ===== Moyen de paiement (ceux du panel, actifs et manuels) =====
    if (!paymentMethodId) return NextResponse.json({ error: "Moyen de paiement manquant." }, { status: 400 });
    const method = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
    if (!method) return NextResponse.json({ error: "Moyen de paiement introuvable." }, { status: 400 });
    if (!method.isActive) return NextResponse.json({ error: "Ce moyen de paiement n'est plus disponible." }, { status: 400 });
    if (!method.isManual) return NextResponse.json({ error: "Ce moyen de paiement ne nécessite pas de reçu manuel." }, { status: 400 });

    // ===== Pas de double demande en attente (comme le Pass) =====
    const pending = await prisma.rechargeRequest.findFirst({
      where: { userId: user.id, status: 'EN_ATTENTE' },
    });
    if (pending) return NextResponse.json({ error: "Tu as déjà une demande de recharge en attente de validation." }, { status: 400 });

    // ===== Validation du fichier =====
    if (!file) return NextResponse.json({ error: "Aucun fichier envoyé." }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "L'image dépasse 4 Mo." }, { status: 400 });

    // ===== Upload dans Supabase Storage (même bucket que le Pass) =====
    let receiptPath: string;
    try {
      receiptPath = await uploadReceipt(file, user.id);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Erreur lors du téléversement du reçu." }, { status: 500 });
    }

    // ===== Création de la demande (upload d'abord, demande ensuite) =====
    const amountFCFA = uaToFCFA(amountUA);
    const rc = await prisma.rechargeRequest.create({
      data: {
        userId: user.id,
        amountUA,
        amountFCFA,
        paymentMethodId,
        receiptUrl: receiptPath,
        status: 'EN_ATTENTE',
      },
    });

    return NextResponse.json({ success: true, requestId: rc.id, amountUA, amountFCFA });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du reçu." }, { status: 500 });
  }
}