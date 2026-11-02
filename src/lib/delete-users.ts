import prisma from '@/lib/prisma';

// Suppression DÉFINITIVE de comptes et de tout ce qui leur appartient (numéro WhatsApp, cas joués,
// duels, messages, reçus, UA, retraits, profil ambassadeur), en une seule transaction : tout ou rien.
// Les contrôles (ADMIN, admin connecté, protection du lancement) sont faits par la route appelante.
export async function deleteUsersCompletely(ids: string[]) {
  return prisma.$transaction(async (tx) => {
    const inIds = { in: ids };
    const ambassadorIds = (await tx.ambassador.findMany({ where: { userId: inIds }, select: { id: true } })).map(a => a.id);
    const inAmb = { in: ambassadorIds };

    // Tables sans lien automatique vers User
    await tx.userPhone.deleteMany({ where: { userId: inIds } });
    await tx.ambassadorPanelAccess.deleteMany({ where: { ambassadorId: inAmb } });

    // Ambassadeurs supprimés : commissions, versements, et lien « parrainé par » des comptes gardés
    await tx.ambassadorCommission.deleteMany({
      where: { OR: [{ userId: inIds }, { ambassadorId: inAmb }, { premiumRequest: { userId: inIds } }] },
    });
    await tx.ambassadorPayout.deleteMany({ where: { ambassadorId: inAmb } });
    await tx.user.updateMany({ where: { referredById: inAmb }, data: { referredById: null } });
    await tx.ambassador.deleteMany({ where: { id: inAmb } });

    // Liens entre deux comptes (si l'un des deux est supprimé)
    const duels = await tx.duel.deleteMany({ where: { OR: [{ requesterId: inIds }, { opponentId: inIds }] } });
    await tx.friendship.deleteMany({ where: { OR: [{ requesterId: inIds }, { addresseeId: inIds }] } });
    const messages = await tx.directMessage.deleteMany({ where: { OR: [{ senderId: inIds }, { recipientId: inIds }] } });

    // Données du compte (saisons et tournoi partent par cascade : tables peut-être absentes)
    const attempts = await tx.attempt.deleteMany({ where: { userId: inIds } });
    await tx.monetiseAttempt.deleteMany({ where: { userId: inIds } });
    await tx.dailyCaseSelection.deleteMany({ where: { userId: inIds } });
    await tx.monetiseSelection.deleteMany({ where: { userId: inIds } });
    await tx.userBadge.deleteMany({ where: { userId: inIds } });
    await tx.notification.deleteMany({ where: { userId: inIds } });
    await tx.arenaRewardClaim.deleteMany({ where: { userId: inIds } });
    const premium = await tx.premiumRequest.deleteMany({ where: { userId: inIds } });
    const pass = await tx.passRequest.deleteMany({ where: { userId: inIds } });
    const recharges = await tx.rechargeRequest.deleteMany({ where: { userId: inIds } });
    const withdrawals = await tx.withdrawalRequest.deleteMany({ where: { userId: inIds } });
    await tx.uaTransaction.deleteMany({ where: { userId: inIds } });
    await tx.rushSession.deleteMany({ where: { userId: inIds } });
    await tx.userInventory.deleteMany({ where: { userId: inIds } });

    const users = await tx.user.deleteMany({ where: { id: inIds } });

    return {
      users: users.count,
      ambassadors: ambassadorIds.length,
      attempts: attempts.count,
      duels: duels.count,
      messages: messages.count,
      receipts: premium.count + pass.count + recharges.count,
      withdrawals: withdrawals.count,
    };
  }, { timeout: 60_000 });
}
