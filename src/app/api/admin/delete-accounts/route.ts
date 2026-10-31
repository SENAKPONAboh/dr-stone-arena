import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { LAUNCH_PROTECTION_DATE } from '@/lib/launch-protection';

// ⚠️ SUPPRESSION DÉFINITIVE des comptes de test choisis par l'admin dans la Zone dangereuse.
// Le client envoie la liste EXACTE des comptes qu'il a vus et décochés (deleteIds) : un compte créé
// pendant que la page était ouverte n'est donc jamais supprimé par erreur.
// Toujours protégés côté serveur : les comptes ADMIN, l'admin connecté et les comptes créés
// à partir du lancement (vrais étudiants).
const CONFIRM_WORD = 'SUPPRIMER';

export async function POST(request: Request) {
  const admin = await getCurrentUserCore();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (body.confirmation !== CONFIRM_WORD) {
      return NextResponse.json({ error: "Confirmation invalide." }, { status: 400 });
    }
    const requested: unknown = body.deleteIds;
    if (!Array.isArray(requested) || requested.some(id => typeof id !== 'string')) {
      return NextResponse.json({ error: "Liste de comptes invalide." }, { status: 400 });
    }

    const targets = await prisma.user.findMany({
      where: {
        id: { in: requested as string[], not: admin.id },
        role: { not: 'ADMIN' },
        createdAt: { lt: LAUNCH_PROTECTION_DATE },
      },
      select: { id: true },
    });
    const ids = targets.map(t => t.id);
    if (ids.length === 0) {
      return NextResponse.json({ error: "Aucun compte à supprimer." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
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

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur pendant la suppression : rien n'a été supprimé." }, { status: 500 });
  }
}
