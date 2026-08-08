import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { name, subjectId } = await request.json();
    if (!name || !subjectId) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    const chapter = await prisma.chapter.create({
      data: { name, subjectId }
    });

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}