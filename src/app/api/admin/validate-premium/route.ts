import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { requestId, userId, action } = await request.json();

    // Récupérer la demande pour connaître le plan demandé
    const premiumRequest = await prisma.premiumRequest.findUnique({
      where: { id: requestId }
    });

    if (!premiumRequest) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }

    // Mettre à jour la demande (date d'encaissement enregistrée à la validation)
    await prisma.premiumRequest.update({
      where: { id: requestId },
      data: { status: action, ...(action === 'VALIDE' ? { validatedAt: new Date() } : {}) }
    });

    // Si validé, activer le Premium (plan demandé) pendant 30 jours
    if (action === 'VALIDE') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // +30 jours

      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumTier: premiumRequest.tier ?? 1, // fallback Premium I pour les anciennes demandes sans plan
          premiumExpiresAt: expiryDate
        }
      });

      // ============================================================
      // 🤝 GÉNÉRATION AUTOMATIQUE DE LA COMMISSION AMBASSADEUR
      // Conditions : payeur rattaché + ambassadeur ACTIF + montant connu
      // + pas encore de commission pour cette transaction (anti-doublon §24)
      // ============================================================
      const payer = await prisma.user.findUnique({
        where: { id: premiumRequest.userId },
        select: { id: true, referredById: true, prenom: true, nom: true, pseudo: true }
      });

      if (payer?.referredById && premiumRequest.amount) {
        const ambassador = await prisma.ambassador.findUnique({
          where: { id: payer.referredById },
          select: { id: true, status: true, commissionRate: true, userId: true }
        });

        if (ambassador && ambassador.status === 'ACTIF') {
          const existingCommission = await prisma.ambassadorCommission.findUnique({
            where: { premiumRequestId: premiumRequest.id }
          });

          if (!existingCommission) {
            const commissionAmount = Math.round((premiumRequest.amount * ambassador.commissionRate) / 100);

            try {
              await prisma.ambassadorCommission.create({
                data: {
                  ambassadorId: ambassador.id,
                  premiumRequestId: premiumRequest.id, // @unique → doublon impossible en base
                  userId: payer.id,
                  amount: commissionAmount,
                  status: 'EN_ATTENTE'
                }
              });

              // Notification à l'ambassadeur
              const payerName = payer.pseudo || `${payer.prenom} ${payer.nom}`;
              await prisma.notification.create({
                data: {
                  userId: ambassador.userId,
                  message: `💰 Nouvelle commission de ${commissionAmount.toLocaleString('fr-FR')} FCFA ! ${payerName} vient de valider son abonnement Premium.`,
                  icon: '💰'
                }
              });
            } catch (e: any) {
              // P2002 = commission déjà existante pour cette transaction (anti-doublon structurel) → on ignore
              if (e?.code !== 'P2002') throw e;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}