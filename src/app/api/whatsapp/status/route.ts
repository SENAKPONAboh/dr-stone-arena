import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { formatWhatsapp } from '@/lib/indicatifs';
import { verificationCode, verificationMessage, whatsappVerifyEnabled } from '@/lib/whatsapp-verify';
import { ARENA_WHATSAPP_NUMBER } from '@/lib/community';

// GET  : état de la vérification de l'étudiant connecté (+ lien WhatsApp avec le code déjà écrit).
// POST : enregistrer / corriger son numéro tant qu'il n'est pas vérifié (comptes créés avant le numéro obligatoire).

async function stateFor(userId: string) {
  let row: { phone: string; verifiedAt: Date | null } | null = null;
  try {
    row = await prisma.userPhone.findUnique({ where: { userId }, select: { phone: true, verifiedAt: true } });
  } catch { /* table pas encore créée */ }
  const enabled = whatsappVerifyEnabled();
  const code = row && !row.verifiedAt ? verificationCode(userId, row.phone) : null;
  return {
    enabled,
    phone: row?.phone ?? null,
    verified: !!row?.verifiedAt,
    link: enabled && code ? `https://wa.me/${ARENA_WHATSAPP_NUMBER}?text=${encodeURIComponent(verificationMessage(code))}` : null,
    code: enabled ? code : null,
  };
}

export async function GET() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.json(await stateFor(user.id), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const phone = formatWhatsapp(String(body?.phoneCode ?? ''), String(body?.phoneLocal ?? ''));
  if (!phone) return NextResponse.json({ error: 'Numéro WhatsApp invalide.' }, { status: 400 });

  try {
    const mine = await prisma.userPhone.findUnique({ where: { userId: user.id } });
    if (mine?.verifiedAt) return NextResponse.json({ error: 'Ton numéro est déjà vérifié.' }, { status: 400 });
    const taken = await prisma.userPhone.findUnique({ where: { phone } });
    if (taken && taken.userId !== user.id) return NextResponse.json({ error: 'Ce numéro est déjà utilisé par un autre compte.' }, { status: 400 });
    await prisma.userPhone.upsert({ where: { userId: user.id }, update: { phone }, create: { userId: user.id, phone } });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Ce numéro est déjà utilisé par un autre compte.' }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
  return NextResponse.json(await stateFor(user.id));
}
