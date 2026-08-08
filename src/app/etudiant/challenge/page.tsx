import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ChallengeClient from '@/components/dashboard/ChallengeClient';

export default async function ChallengePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // 1. Trouver les cas que l'étudiant a DÉJÀ faits
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    select: { clinicalCaseId: true }
  });
  const attemptedIds = attempts.map(a => a.clinicalCaseId);

  // 2. Chercher un cas de son année qu'il n'a PAS encore fait
   const clinicalCase = await prisma.clinicalCase.findFirst({
    where: {
      id: { notIn: attemptedIds },
      anneeEtude: user.anneeEtude ?? 1, // <-- FILTRE PAR ANNEE DE L'ETUDIANT
    },
    include: {
      chapter: { include: { subject: true } }
    }
  });

  // 3. S'il n'y a plus de cas, message de félicitations
  if (!clinicalCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Arène nettoyée !</h2>
          <p className="text-gray-500 mb-6">Tu as résolu tous les cas disponibles pour ton année. Reviens plus tard pour de nouveaux défis !</p>
          <a href="/etudiant" className="inline-block py-3 px-6 bg-emerald-500 text-white font-bold rounded-2xl">Retour au dashboard</a>
        </div>
      </div>
    );
  }

  // 4. Envoyer le cas au composant client (pour le chronomètre)
  return <ChallengeClient clinicalCase={clinicalCase} />;
}