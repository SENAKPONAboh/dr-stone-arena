import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import MonetisePlayClient from '@/components/monetise/MonetisePlayClient';
import { getOrCreateMonetiseSelection } from '@/lib/monetise-daily';

export default async function MonetisePlayPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  if (!user.passActive) redirect('/etudiant/monetise/pass');

  const level = user.anneeEtude ?? 1;
  const caseIds = await getOrCreateMonetiseSelection(user.id, level);

  // Cas du jour déjà tentés aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attemptsToday = await prisma.monetiseAttempt.findMany({
    where: { userId: user.id, clinicalCaseId: { in: caseIds }, createdAt: { gte: today } },
    select: { clinicalCaseId: true },
  });
  const attemptedIds = new Set(attemptsToday.map(a => a.clinicalCaseId));
  const remaining = caseIds.filter(id => !attemptedIds.has(id));

  const infoScreen = (emoji: string, title: string, text: string) => (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="text-center bg-white/5 border border-yellow-500/20 p-8 rounded-3xl max-w-md w-full">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-yellow-300 mb-2">{title}</h2>
        <p className="text-white/50 mb-6">{text}</p>
        <a href="/etudiant/monetise" className="inline-block py-3 px-6 bg-yellow-500 text-[#1a1308] font-bold rounded-2xl">Retour au dashboard</a>
      </div>
    </div>
  );

  if (caseIds.length === 0) {
    return infoScreen('📭', 'Pas encore de cas pour ton niveau', 'De nouveaux cas cliniques seront bientôt publiés pour ton niveau.');
  }

  if (remaining.length === 0) {
    return infoScreen('🌙', 'Journée terminée !', `Tu as joué tes ${caseIds.length} cas du jour. Reviens demain pour 10 nouveaux cas.`);
  }

  // Prochain cas
  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: remaining[0] },
    include: { chapter: { include: { subject: true } } },
  });
  if (!clinicalCase) return infoScreen('⚠️', 'Erreur', 'Cas introuvable, réessaie dans un instant.');

  const caseNumber = caseIds.length - remaining.length + 1;

  return (
    <MonetisePlayClient
      clinicalCase={{
        id: clinicalCase.id,
        title: clinicalCase.title,
        statement: clinicalCase.statement,
        options: clinicalCase.options,
        correctAnswer: clinicalCase.correctAnswer,
        explanation: clinicalCase.explanation,
        durationMax: clinicalCase.durationMax,
        difficulty: clinicalCase.difficulty,
        subject: clinicalCase.chapter.subject.name,
        chapter: clinicalCase.chapter.name,
      }}
      progressLabel={`Cas ${caseNumber}/${caseIds.length} du jour`}
    />
  );
}