import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { amount, category, description, vendor, spentAt } = body;

    const amountValue = parseInt(amount);
    if (!amountValue || amountValue <= 0) {
      return NextResponse.json({ error: "Montant invalide (entier positif requis)." }, { status: 400 });
    }
    if (!EXPENSE_CATEGORIES.some(c => c.value === category)) {
      return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
    }
    const date = new Date(spentAt);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        amount: amountValue,
        category,
        description: description || null,
        vendor: vendor || null,
        spentAt: date,
      }
    });

    return NextResponse.json({ expense }, { status: 201 });
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

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Dépense introuvable ou erreur serveur." }, { status: 500 });
  }
}