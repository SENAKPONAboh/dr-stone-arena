import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { GOAL_TYPES } from '@/lib/goal-types';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, target, period } = body;

    const targetValue = parseInt(target);
    if (!targetValue || targetValue <= 0) {
      return NextResponse.json({ error: "Cible invalide (entier positif requis)." }, { status: 400 });
    }
    if (!GOAL_TYPES.some(t => t.value === type)) {
      return NextResponse.json({ error: "Type d'objectif invalide." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(period) && !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: "Période invalide (format YYYY ou YYYY-MM)." }, { status: 400 });
    }

    const goal = await prisma.financialGoal.create({
      data: { type, target: targetValue, period }
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

    await prisma.financialGoal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Objectif introuvable ou erreur serveur." }, { status: 500 });
  }
}