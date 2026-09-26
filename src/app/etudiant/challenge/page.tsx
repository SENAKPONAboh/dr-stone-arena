import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ChallengeClient from '@/components/dashboard/ChallengeClient';
import { getOrCreateDailySelection } from '@/lib/daily-cases';

export default async function ChallengePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const level = user.anneeEtude ?? 1;

  // 1. Les 10 cas du jour de CET étudiant (figés pour la journée)
  const caseIds = await getOrCreateDailySelection(user.id, level);

  // 2. Cas du jour déjà tentés aujourd'hui → filtrés
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attemptsToday = await prisma.attempt.findMany({
    where: { userId: user.id, clinicalCaseId: { in: caseIds }, createdAt: { gte: today } },
    select: { clinicalCaseId: true },
  });
  const attemptedTodayIds = new Set(attemptsToday.map(a => a.clinicalCaseId));
  const remaining = caseIds.filter(id => !attemptedTodayIds.has(id));

  const infoScreen = (emoji: string, title: string, text: string, buttonText: string = 'Retour au tableau de bord') => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 mb-6">{text}</p>
        <a href="/etudiant" className="inline-block py-3 px-6 bg-emerald-500 text-white font-bold rounded-2xl">{buttonText}</a>
      </div>
    </div>
  );

  // 3. Plus de vies → le frein (le Premium régénère plus vite)
  if (user.lives <= 0) {
    return infoScreen('❌', 'Plus de vies', `Tes vies se régénèrent lentement (${user.isPremium ? '1/heure en Premium' : '1/24h en gratuit'}). Tes ${remaining.length} cas restants du jour t'attendent quand tu auras récupéré des vies !`);
  }

  // 4. Banque vide pour ce niveau
  if (caseIds.length === 0) {
    return infoScreen('📭', 'Pas encore de cas pour ton niveau', 'De nouveaux cas cliniques seront bientôt publiés pour ton niveau. Reviens bientôt !', 'Revenir plus tard');
  }

  // 5. Journée terminée : les 10 cas du jour ont été joués
  if (remaining.length === 0) {
    return infoScreen('🌙', 'Journée terminée !', `Tu as joué tes ${caseIds.length} cas du jour. Reviens demain pour ${CASES_PER_DAY_TEXT} nouveaux cas tirés au hasard dans la banque.`, 'Revenir demain');
  }

  // 6. Servir le prochain cas du jour
  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: remaining[0] },
    include: { chapter: { include: { subject: true } } },
  });
  if (!clinicalCase) {
    return infoScreen('⚠️', 'Cas introuvable', 'Une erreur est survenue, réessaie dans un instant.');
  }

  const caseNumber = caseIds.length - remaining.length + 1;

  return (
    <ChallengeClient
      clinicalCase={clinicalCase}
      progressLabel={`Cas ${caseNumber}/${caseIds.length} du jour`}
    />
  );
}

const CASES_PER_DAY_TEXT = '10';