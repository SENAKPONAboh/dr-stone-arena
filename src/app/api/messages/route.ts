import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ===== MESSAGES PRIVÉS (réservés aux amis) =====

const USER_SELECT = { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true, anneeEtude: true, isPremium: true } as const;

async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await prisma.friendship.findFirst({
    where: { status: 'ACCEPTE', OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] },
  });
  return !!f;
}

export async function GET(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ETUDIANT') return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const withUserId = searchParams.get('withUserId');
    if (!withUserId) return NextResponse.json({ error: "Paramètre manquant." }, { status: 400 });

    if (!(await areFriends(user.id, withUserId))) {
      return NextResponse.json({ error: "Vous n'êtes pas amis avec cette personne." }, { status: 403 });
    }

    // Marquer lus les messages reçus de cet ami
    await prisma.directMessage.updateMany({
      where: { recipientId: user.id, senderId: withUserId, isRead: false },
      data: { isRead: true },
    });

    const [messages, friend] = await Promise.all([
      prisma.directMessage.findMany({
        where: { OR: [{ senderId: user.id, recipientId: withUserId }, { senderId: withUserId, recipientId: user.id }] },
        orderBy: { createdAt: 'asc' },
        take: 100,
      }),
      prisma.user.findUnique({ where: { id: withUserId }, select: USER_SELECT }),
    ]);

    return NextResponse.json({ messages, friend });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ETUDIANT') return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { toUserId, message } = await request.json();
    const msg = String(message ?? '').trim();
    const targetId = String(toUserId ?? '');
    if (!targetId || !msg) return NextResponse.json({ error: "Message vide." }, { status: 400 });
    if (msg.length > 500) return NextResponse.json({ error: "Message trop long (500 caractères max)." }, { status: 400 });

    if (!(await areFriends(user.id, targetId))) {
      return NextResponse.json({ error: "Tu peux seulement écrire à tes amis." }, { status: 403 });
    }

    // Anti-spam : 1 message / 2 secondes
    const last = await prisma.directMessage.findFirst({
      where: { senderId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (last && Date.now() - new Date(last.createdAt).getTime() < 2000) {
      return NextResponse.json({ error: "Doucement ! Attends 2 secondes entre deux messages." }, { status: 400 });
    }

    const created = await prisma.directMessage.create({
      data: { senderId: user.id, recipientId: targetId, message: msg },
    });

    return NextResponse.json({ success: true, message: created });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}