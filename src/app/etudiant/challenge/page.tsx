import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ChallengeClient from '@/components/dashboard/ChallengeClient';
import DayRecap from '@/components/dashboard/DayRecap';
import { getOrCreateDailySelection } from '@/lib/daily-cases';
import Link from 'next/link';
import BackgroundCells from '@/components/ui/BackgroundCells';
import Icon, { type IconName } from '@/components/ui/Icon';

const CASES_PER_DAY_TEXT = '10';

function InfoScreen({ icon, color, title, text, buttonText = 'Retour au tableau de bord' }: {
  icon: IconName; color: string; title: string; text: string; buttonText?: string;
}) {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center p-2">
      <BackgroundCells />
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-slab p-8 text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slab-2 ${color}`}>
          <Icon name={icon} size={34} />
        </div>
        <h2 className="mb-2 font-display text-xl font-extrabold text-ink">{title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-mute">{text}</p>
        <Link href="/etudiant"
          className="inline-block rounded-2xl bg-mala px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
          {buttonText}
        </Link>
      </div>
    </div>
  );
}

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
    select: { clinicalCaseId: true, isCorrect: true, xpEarned: true },
  });
  const attemptedTodayIds = new Set(attemptsToday.map(a => a.clinicalCaseId));
  const remaining = caseIds.filter(id => !attemptedTodayIds.has(id));

  // 3. Plus de vies → le frein (le Premium régénère plus vite)
  if (user.lives <= 0) {
    return <InfoScreen icon="heart" color="text-heart" title="Plus de vies"
      text={`Tes vies se régénèrent lentement (${user.isPremium ? '1/heure en Premium' : '1/24h en gratuit'}). Tes ${remaining.length} cas restants du jour t'attendent quand tu auras récupéré des vies !`} />;
  }

  // 4. Banque vide pour ce niveau
  if (caseIds.length === 0) {
    return <InfoScreen icon="stethoscope" color="text-sky" title="Pas encore de cas pour ton niveau"
      text="De nouveaux cas cliniques seront bientôt publiés pour ton niveau. Reviens bientôt !" buttonText="Revenir plus tard" />;
  }

  // 5. Journée terminée : écran récapitulatif animé
  if (remaining.length === 0) {
    return (
      <DayRecap
        total={caseIds.length}
        correct={attemptsToday.filter(a => a.isCorrect).length}
        xp={attemptsToday.reduce((s, a) => s + a.xpEarned, 0)}
        streak={user.streak}
        nextBatch={CASES_PER_DAY_TEXT}
      />
    );
  }

  // 6. Servir le prochain cas du jour
  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: remaining[0] },
    include: { chapter: { include: { subject: true } } },
  });
  if (!clinicalCase) {
    return <InfoScreen icon="close" color="text-heart" title="Cas introuvable" text="Une erreur est survenue, réessaie dans un instant." />;
  }

  const caseNumber = caseIds.length - remaining.length + 1;

  // ⚠️ correctAnswer et explanation ne sont JAMAIS envoyés au navigateur :
  // le serveur les renvoie seulement après la réponse (/api/challenge/submit).
  return (
    <ChallengeClient
      key={clinicalCase.id}
      clinicalCase={{
        id: clinicalCase.id,
        title: clinicalCase.title,
        statement: clinicalCase.statement,
        options: clinicalCase.options,
        durationMax: clinicalCase.durationMax,
        xp: clinicalCase.xp,
        difficulty: clinicalCase.difficulty,
        chapter: { name: clinicalCase.chapter.name, subject: { name: clinicalCase.chapter.subject.name } },
      }}
      caseNumber={caseNumber}
      total={caseIds.length}
    />
  );
}
