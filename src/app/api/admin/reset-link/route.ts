import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createResetLink } from '@/lib/password-reset';

// Admin : crée un lien de réinitialisation (30 min, usage unique) à envoyer à l'étudiant sur WhatsApp.
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const { userId } = await request.json();
    const user = await prisma.user.findUnique({ where: { id: String(userId ?? '') }, select: { id: true, password: true, role: true } });
    if (!user || user.role === 'ADMIN') return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
    return NextResponse.json({ link: await createResetLink(new URL(request.url).origin, user) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
