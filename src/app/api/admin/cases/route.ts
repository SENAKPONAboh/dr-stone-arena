import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  
  // Sécurité : seul un admin peut créer un cas
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, difficulty, xp, statement, options, correctAnswer, explanation, durationMax, chapterId, anneeEtude } = body;

    // Validation basique
    if (!title || !statement || !correctAnswer || !chapterId || !anneeEtude) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const newCase = await prisma.clinicalCase.create({
      data: {
        title,
        difficulty,
        xp: parseInt(xp),
        statement,
        options: options.split('\n').map((opt: string) => opt.trim()).filter(Boolean),
        correctAnswer,
        explanation,
        durationMax: parseInt(durationMax),
        chapterId,
        anneeEtude: parseInt(anneeEtude),
      }
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}