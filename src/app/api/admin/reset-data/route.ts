import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { MAX_LIVES } from '@/lib/lives';

// ⚠️ INITIALISATION TOTALE — remet toutes les données de jeu à zéro.
// Conservé : cas cliniques, matières, chapitres, comptes, ambassadeurs, moyens de paiement.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (body.confirmation !== 'RESET') {
      return NextResponse.json({ error: "Confirmation invalide." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // ===== Suppression des données de jeu =====
      const commissions = await tx.ambassadorCommission.deleteMany();
      const payouts = await tx.ambassadorPayout.deleteMany();
      const arenaClaims = await tx.arenaRewardClaim.deleteMany();
      const duels = await tx.duel.deleteMany();
      const dailySelections = await tx.dailyCaseSelection.deleteMany();
      const attempts = await tx.attempt.deleteMany();
      const badges = await tx.userBadge.deleteMany();
      const premiumRequests = await tx.premiumRequest.deleteMany();
      const notifications = await tx.notification.deleteMany();
      const expenses = await tx.expense.deleteMany();
      const goals = await tx.financialGoal.deleteMany();

      // ===== Reset des comptes étudiants (comptes conservés, stats à zéro) =====
      const students = await tx.user.updateMany({
        where: { role: 'ETUDIANT' },
        data: {
          xp: 0,
          streak: 0,
          lives: MAX_LIVES,
          chestAvailable: false,
          lastLifeLostAt: null,
          lastDailyRewardClaimedAt: null,
          lastActive: null,
          duelsWon: 0,
          duelsLost: 0,
          pointsArena: 0,
          isPremium: false,
          premiumTier: null,
          premiumExpiresAt: null,
          onboardingCompleted: false,
          referredById: null,
        },
      });

      return {
        commissions: commissions.count,
        payouts: payouts.count,
        arenaClaims: arenaClaims.count,
        duels: duels.count,
        dailySelections: dailySelections.count,
        attempts: attempts.count,
        badges: badges.count,
        premiumRequests: premiumRequests.count,
        notifications: notifications.count,
        expenses: expenses.count,
        goals: goals.count,
        studentsReset: students.count,
      };
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur pendant l'initialisation." }, { status: 500 });
  }
}