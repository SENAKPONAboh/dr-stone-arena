import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ===== AMIS & INVITATIONS =====
// GET  : amis + invitations reçues/envoyées + non-lus par ami
// POST : SEARCH | REQUEST | ACCEPT | REFUSE | CANCEL | REMOVE

const USER_SELECT = { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true, anneeEtude: true, isPremium: true } as const;

export async function GET(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ETUDIANT') return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const [reqOut, reqIn] = await Promise.all([
      prisma.friendship.findMany({ where: { requesterId: user.id, status: 'ACCEPTE' }, include: { addressee: { select: USER_SELECT } } }),
      prisma.friendship.findMany({ where: { addresseeId: user.id, status: 'ACCEPTE' }, include: { requester: { select: USER_SELECT } } }),
    ]);
    const friends = [...reqOut.map(f => f.addressee), ...reqIn.map(f => f.requester)].filter(u => u.id !== user.id);

    const [incoming, outgoing, unread] = await Promise.all([
      prisma.friendship.findMany({ where: { addresseeId: user.id, status: 'EN_ATTENTE' }, include: { requester: { select: USER_SELECT } }, orderBy: { createdAt: 'desc' } }),
      prisma.friendship.findMany({ where: { requesterId: user.id, status: 'EN_ATTENTE' }, include: { addressee: { select: USER_SELECT } }, orderBy: { createdAt: 'desc' } }),
      prisma.directMessage.groupBy({ by: ['senderId'], where: { recipientId: user.id, isRead: false }, _count: { _all: true } }),
    ]);

    const unreadMap: Record<string, number> = {};
    unread.forEach(g => { unreadMap[g.senderId] = g._count._all; });

    return NextResponse.json({
      friends: friends.map(f => ({ ...f, unread: unreadMap[f.id] ?? 0 })),
      incoming: incoming.map(f => ({ friendshipId: f.id, user: f.requester, createdAt: f.createdAt })),
      outgoing: outgoing.map(f => ({ friendshipId: f.id, user: f.addressee, createdAt: f.createdAt })),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ETUDIANT') return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { action, q, userId, friendshipId } = await request.json();

    // ===== 🔍 Rechercher des étudiants =====
    if (action === 'SEARCH') {
      const query = String(q ?? '').trim();
      if (query.length < 2) return NextResponse.json({ results: [] });

      const friendships = await prisma.friendship.findMany({
        where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
        select: { requesterId: true, addresseeId: true, status: true },
      });
      const exclude = new Set<string>([user.id]);
      friendships.forEach(f => {
        if (f.status !== 'REFUSE') exclude.add(f.requesterId === user.id ? f.addresseeId : f.requesterId);
      });

      const results = await prisma.user.findMany({
        where: {
          id: { notIn: [...exclude] },
          role: 'ETUDIANT', statut: 'VALIDE',
          OR: [
            { pseudo: { contains: query, mode: 'insensitive' } },
            { prenom: { contains: query, mode: 'insensitive' } },
            { nom: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: USER_SELECT,
        take: 10,
      });
      return NextResponse.json({ results });
    }

    // ===== 📨 Envoyer une invitation =====
    if (action === 'REQUEST') {
      const targetId = String(userId ?? '');
      if (targetId === user.id) return NextResponse.json({ error: "Tu ne peux pas t'inviter toi-même." }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true, statut: true } });
      if (!target || target.role !== 'ETUDIANT' || target.statut !== 'VALIDE') {
        return NextResponse.json({ error: "Étudiant introuvable." }, { status: 404 });
      }

      const existing = await prisma.friendship.findFirst({
        where: { OR: [{ requesterId: user.id, addresseeId: targetId }, { requesterId: targetId, addresseeId: user.id }] },
      });
      if (existing) {
        if (existing.status === 'ACCEPTE') return NextResponse.json({ error: "Vous êtes déjà amis." }, { status: 400 });
        if (existing.status === 'EN_ATTENTE') return NextResponse.json({ error: "Une invitation est déjà en attente entre vous." }, { status: 400 });
        // REFUSE → on relance proprement
        await prisma.friendship.delete({ where: { id: existing.id } });
      }
      await prisma.friendship.create({ data: { requesterId: user.id, addresseeId: targetId } });
      return NextResponse.json({ success: true });
    }

    // ===== ✅❌ Répondre à une invitation (accepter / refuser) =====
    if (action === 'ACCEPT' || action === 'REFUSE') {
      const f = await prisma.friendship.findUnique({ where: { id: String(friendshipId ?? '') } });
      if (!f || f.addresseeId !== user.id) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
      if (f.status !== 'EN_ATTENTE') return NextResponse.json({ error: "Cette invitation a déjà été traitée." }, { status: 400 });

      await prisma.friendship.update({
        where: { id: f.id },
        data: { status: action === 'ACCEPT' ? 'ACCEPTE' : 'REFUSE', respondedAt: new Date() },
      });
      if (action === 'ACCEPT') {
        await prisma.notification.create({
          data: { userId: f.requesterId, message: `🤝 ${user.pseudo || user.prenom} a accepté ton invitation ! Tu peux maintenant discuter avec lui.`, icon: '🤝' },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ===== ↩️ Annuler une invitation envoyée =====
    if (action === 'CANCEL') {
      const f = await prisma.friendship.findUnique({ where: { id: String(friendshipId ?? '') } });
      if (!f || f.requesterId !== user.id || f.status !== 'EN_ATTENTE') {
        return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
      }
      await prisma.friendship.delete({ where: { id: f.id } });
      return NextResponse.json({ success: true });
    }

    // ===== 🗑️ Retirer un ami =====
    if (action === 'REMOVE') {
      const targetId = String(userId ?? '');
      const f = await prisma.friendship.findFirst({
        where: { status: 'ACCEPTE', OR: [{ requesterId: user.id, addresseeId: targetId }, { requesterId: targetId, addresseeId: user.id }] },
      });
      if (!f) return NextResponse.json({ error: "Amitié introuvable." }, { status: 404 });
      await prisma.friendship.delete({ where: { id: f.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}