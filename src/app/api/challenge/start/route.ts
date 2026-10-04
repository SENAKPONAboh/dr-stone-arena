import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { getTodaySelection } from '@/lib/daily-cases';
import { signChallengeToken } from '@/lib/challenge-token';

// L'étudiant commence un cas : on note l'heure de départ (jeton signé) pour mesurer le temps côté serveur.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { clinicalCaseId } = await request.json();
    if (typeof clinicalCaseId !== 'string') return NextResponse.json({ error: 'Cas invalide' }, { status: 400 });

    const selection = await getTodaySelection(user.id);
    if (!selection || !selection.includes(clinicalCaseId)) {
      return NextResponse.json({ error: 'Ce cas ne fait pas partie de ton défi du jour.' }, { status: 403 });
    }
    if (user.lives <= 0) return NextResponse.json({ error: "Tu n'as plus de vies." }, { status: 403 });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const done = await prisma.attempt.findFirst({
      where: { userId: user.id, clinicalCaseId, createdAt: { gte: startOfDay } },
      select: { id: true },
    });
    if (done) return NextResponse.json({ error: "Tu as déjà joué ce cas aujourd'hui." }, { status: 409 });

    return NextResponse.json({ token: await signChallengeToken(user.id, clinicalCaseId) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
