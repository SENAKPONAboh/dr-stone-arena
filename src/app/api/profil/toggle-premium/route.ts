import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Inverse le statut Premium (si true -> false, si false -> true)
  const newStatus = !user.isPremium;

  await prisma.user.update({
    where: { id: user.id },
    data: { isPremium: newStatus }
  });

  return NextResponse.json({ success: true, isPremium: newStatus });
}