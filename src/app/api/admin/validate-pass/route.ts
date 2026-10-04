import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { requestId, action } = await request.json();

    const passRequest = await prisma.passRequest.findUnique({ where: { id: requestId } });
    if (!passRequest) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

    // 🔒 Une demande ne se traite qu'une fois : passage atomique depuis EN_ATTENTE.
    // Un double clic ne prolonge donc plus le Pass deux fois (+60 jours).
    const changed = await prisma.passRequest.updateMany({
      where: { id: requestId, status: 'EN_ATTENTE' },
      data: { status: action, ...(action === 'VALIDE' ? { validatedAt: new Date() } : {}) }
    });
    if (changed.count === 0) {
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
    }
    // Le bénéficiaire est celui de la demande (et non une valeur envoyée par le navigateur)
    const userId = passRequest.userId;

    if (action === 'VALIDE') {
      // Prolongation : +30 jours à partir de l'expiration actuelle si encore active, sinon maintenant
      const now = new Date();
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { passExpiresAt: true } });
      const base = (target?.passExpiresAt && new Date(target.passExpiresAt) > now)
        ? new Date(target.passExpiresAt)
        : now;
      const expiry = new Date(base);
      expiry.setDate(expiry.getDate() + 30);

      await prisma.user.update({
        where: { id: userId },
        data: { passActive: true, passExpiresAt: expiry }
      });

      await prisma.notification.create({
        data: {
          userId,
          message: `🪙 Ton Pass Arène Monétisé est actif jusqu'au ${expiry.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}. Bienvenue dans la plateforme monétisée !`,
          icon: '🪙'
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}