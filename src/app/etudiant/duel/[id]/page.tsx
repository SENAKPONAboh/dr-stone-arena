import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import DuelPlayer from '@/components/duel/DuelPlayer';
import DuelInvitationBanner from '@/components/dashboard/DuelInvitationBanner';
import { expireStaleDuels } from '@/lib/duel-server';

export default async function DuelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  await expireStaleDuels(user.id);

  const duel = await prisma.duel.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } },
      opponent: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } }
    }
  });

  if (!duel) redirect('/etudiant/duel');

  const isRequester = duel.requesterId === user.id;
  const isOpponent = duel.opponentId === user.id;
  if (!isRequester && !isOpponent) redirect('/etudiant/duel');

  const opponent = isRequester ? duel.opponent : duel.requester;
  const opponentName = opponent.pseudo || `${opponent.prenom} ${opponent.nom}`;
  const myCompleted = isRequester ? duel.requesterCompleted : duel.opponentCompleted;

  const header = (
    <header className="bg-white border-b-2 border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
        <Link href="/etudiant/duel" className="text-gray-600 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="font-extrabold text-xl text-gray-800">⚔️ Duel vs {opponentName}</h1>
      </div>
    </header>
  );

  const infoCard = (emoji: string, title: string, text: string) => (
    <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 mb-6">{text}</p>
        <Link href="/etudiant/duel" className="inline-block py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl">Retour aux duels</Link>
      </div>
    </div>
  );

  if (duel.status === 'EN_ATTENTE') {
    if (isOpponent) {
      return (
        <div className="min-h-screen bg-gray-50 pb-10">
          {header}
          <main className="max-w-4xl mx-auto px-4 mt-8">
            <DuelInvitationBanner invites={[{
              id: duel.id,
              requesterName: duel.requester.pseudo || `${duel.requester.prenom} ${duel.requester.nom}`,
              requesterImage: duel.requester.imageUrl,
              expiresAt: duel.expiresAt.toISOString()
            }]} />
          </main>
        </div>
      );
    }
    return infoCard('⏳', 'En attente de réponse', `${opponentName} a encore du temps pour accepter ton défi (24h maximum).`);
  }

  if (duel.status === 'REFUSE') return infoCard('🚫', 'Défi refusé', `${opponentName} a refusé ce duel. Aucun impact sur vos statistiques.`);
  if (duel.status === 'EXPIRE') return infoCard('⌛', 'Invitation expirée', "Ce défi n'a pas reçu de réponse dans les 24h. Il a été annulé sans impact.");

  if (duel.status === 'TERMINE') {
    const myScore = isRequester ? duel.requesterScore : duel.opponentScore;
    const oppScore = isRequester ? duel.opponentScore : duel.requesterScore;
    const won = duel.winnerId === null ? null : duel.winnerId === user.id;
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        {header}
        <main className="max-w-md mx-auto px-4 mt-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">{won === true ? '🏆' : won === false ? '❌' : '🤝'}</div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-4">
              {won === true ? 'Victoire !' : won === false ? 'Défaite' : 'Égalité'}
            </h2>
            <div className="flex justify-center gap-4 mb-6">
              <div className="bg-emerald-50 px-6 py-3 rounded-2xl">
                <p className="text-xs font-bold text-emerald-500 uppercase">Toi</p>
                <p className="text-2xl font-extrabold text-emerald-600">{myScore ?? '—'}/5</p>
              </div>
              <div className="bg-red-50 px-6 py-3 rounded-2xl">
                <p className="text-xs font-bold text-red-400 uppercase">{opponentName}</p>
                <p className="text-2xl font-extrabold text-red-500">{oppScore ?? '—'}/5</p>
              </div>
            </div>
            {won === true && <p className="text-purple-600 font-bold mb-6">🏟️ +10 Points Arena</p>}
            <Link href="/etudiant/duel" className="inline-block py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl">Retour aux duels</Link>
          </div>
        </main>
      </div>
    );
  }

  // status ACCEPTE
  if (myCompleted) {
    return infoCard('⏳', 'Tu as joué !', `En attente que ${opponentName} joue ses 5 cas (ou du forfait s'il dépasse les 24h).`);
  }

  // À moi de jouer : les 5 cas dans l'ordre du tirage
  const cases = await prisma.clinicalCase.findMany({
    where: { id: { in: duel.caseIds } },
    include: { chapter: { include: { subject: true } } }
  });
  const orderedCases = duel.caseIds
    .map(cid => cases.find(c => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  return (
    <DuelPlayer
      duelId={duel.id}
      opponentName={opponentName}
      cases={orderedCases.map(c => ({
        id: c.id,
        title: c.title,
        statement: c.statement,
        options: c.options,
        correctAnswer: c.correctAnswer,
        explanation: c.explanation,
        durationMax: c.durationMax,
        subject: c.chapter.subject.name,
        chapter: c.chapter.name
      }))}
    />
  );
}