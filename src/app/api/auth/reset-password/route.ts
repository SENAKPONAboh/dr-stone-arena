import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { checkResetToken } from '@/lib/password-reset';

// Mot de passe oublié, étape 2 : nouveau mot de passe avec le lien reçu sur WhatsApp (ou donné par l'admin).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body?.token ?? '');
  const password = String(body?.password ?? '');

  if (password.length < 8) return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 });
  if (password.length > 200) return NextResponse.json({ error: 'Mot de passe trop long.' }, { status: 400 });

  const userId = await checkResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Ce lien a expiré ou a déjà servi. Refais la demande depuis « Mot de passe oublié ? ».' }, { status: 400 });
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(password, 10) } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
