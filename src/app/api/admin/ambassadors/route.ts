import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// Génère un code unique si l'admin n'en fournit pas
async function generateUniqueCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 10; i++) {
    const code = 'DSA-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const exists = await prisma.ambassador.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  throw new Error('Impossible de générer un code unique.');
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, referralCode } = body;

    if (!userId) return NextResponse.json({ error: "Étudiant manquant." }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!targetUser || targetUser.role !== 'ETUDIANT') {
      return NextResponse.json({ error: "Étudiant introuvable." }, { status: 404 });
    }

    const already = await prisma.ambassador.findUnique({ where: { userId } });
    if (already) {
      return NextResponse.json({ error: "Cet utilisateur est déjà ambassadeur." }, { status: 400 });
    }

    let code = referralCode ? referralCode.trim().toUpperCase() : '';
    if (code) {
      if (!/^[A-Z0-9-]{3,30}$/.test(code)) {
        return NextResponse.json({ error: "Format de code invalide (lettres, chiffres, tirets — 3 à 30 caractères)." }, { status: 400 });
      }
      const taken = await prisma.ambassador.findUnique({ where: { referralCode: code } });
      if (taken) return NextResponse.json({ error: "Ce code est déjà utilisé." }, { status: 400 });
    } else {
      code = await generateUniqueCode();
    }

    const ambassador = await prisma.ambassador.create({
      data: { userId, referralCode: code, status: 'EN_ATTENTE' }
    });

    return NextResponse.json({ ambassador }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, referralCode } = body;
    if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

    const existing = await prisma.ambassador.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Ambassadeur introuvable." }, { status: 404 });

    const data: any = {};

    if (status !== undefined) {
      if (!['EN_ATTENTE', 'ACTIF', 'SUSPENDU'].includes(status)) {
        return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      }
      data.status = status;
    }

    if (referralCode !== undefined && referralCode !== '') {
      const code = referralCode.trim().toUpperCase();
      if (!/^[A-Z0-9-]{3,30}$/.test(code)) {
        return NextResponse.json({ error: "Format de code invalide." }, { status: 400 });
      }
      const taken = await prisma.ambassador.findFirst({ where: { referralCode: code, id: { not: id } } });
      if (taken) return NextResponse.json({ error: "Ce code est déjà utilisé." }, { status: 400 });
      data.referralCode = code;
    }

    const ambassador = await prisma.ambassador.update({ where: { id }, data });

    // Notification de bienvenue quand l'ambassadeur devient ACTIF
    if (data.status === 'ACTIF' && existing.status !== 'ACTIF') {
      await prisma.notification.create({
        data: {
          userId: ambassador.userId,
          message: `🎉 Tu es maintenant Ambassadeur ! Ton code : ${ambassador.referralCode}. Accède à ton espace depuis le menu 🤝 pour suivre tes commissions.`,
          icon: '🤝'
        }
      });
    }

    return NextResponse.json({ ambassador });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}