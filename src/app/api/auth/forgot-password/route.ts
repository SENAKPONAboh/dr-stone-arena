import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resetCode, resetMessage } from '@/lib/password-reset';
import { whatsappVerifyEnabled } from '@/lib/whatsapp-verify';
import { ARENA_WHATSAPP_NUMBER } from '@/lib/community';

// Mot de passe oublié, étape 1 : donne le message WhatsApp tout prêt à envoyer au numéro d'Arena.
// Même réponse que l'e-mail existe ou non (code factice sinon) : on ne révèle pas qui est inscrit.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Tape ton adresse e-mail.' }, { status: 400 });
  if (!whatsappVerifyEnabled()) return NextResponse.json({ enabled: false });

  try {
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    const code = resetCode(user?.id ?? `inconnu:${email}`);
    const link = `https://wa.me/${ARENA_WHATSAPP_NUMBER}?text=${encodeURIComponent(resetMessage(code))}`;
    return NextResponse.json({ enabled: true, link });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
