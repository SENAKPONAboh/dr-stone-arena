import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true }
  });

  return NextResponse.json({ success: true });
}