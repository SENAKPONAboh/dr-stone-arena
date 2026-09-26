import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Remélange les propositions de TOUS les cas de la banque.
// Utile quand les cas ont été générés avec la bonne réponse toujours en A.
// La bonne réponse est conservée (la correction compare par texte, pas par position).
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const cases = await prisma.clinicalCase.findMany({
      select: { id: true, options: true },
    });

    let count = 0;
    for (const c of cases) {
      if (!c.options || c.options.length < 2) continue;
      await prisma.clinicalCase.update({
        where: { id: c.id },
        data: { options: shuffleArray(c.options) },
      });
      count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur pendant le remélange." }, { status: 500 });
  }
}