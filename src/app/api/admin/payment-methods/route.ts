import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Champs autorisés à la création / modification
const ALLOWED_FIELDS = ['name', 'isActive', 'isManual', 'beneficiaryName', 'paymentIdentifier', 'instructions', 'icon', 'displayOrder', 'provider'];

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
  });

  return NextResponse.json({ methods });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const name = (body.name || '').toString().trim();
    if (!name) return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });

    // Unicité du nom
    const existing = await prisma.paymentMethod.findFirst({ where: { name } });
    if (existing) return NextResponse.json({ error: "Ce moyen de paiement existe déjà." }, { status: 400 });

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        isManual: body.isManual !== false, // défaut : paiement local manuel
        beneficiaryName: body.beneficiaryName || null,
        paymentIdentifier: body.paymentIdentifier || null,
        instructions: body.instructions || null,
        icon: body.icon || null,
        displayOrder: body.displayOrder !== undefined ? parseInt(body.displayOrder) : 99,
        provider: body.provider || null,
        isActive: false, // un nouveau moyen démarre toujours désactivé
      }
    });

    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Moyen de paiement introuvable." }, { status: 404 });

    // Règle anti-fausse-intégration : la carte automatisée ne peut être activée
    // que si un prestataire (provider) est configuré
    const willBeActive = body.isActive !== undefined ? body.isActive : existing.isActive;
    const effectiveIsManual = body.isManual !== undefined ? body.isManual : existing.isManual;
    const effectiveProvider = body.provider !== undefined ? body.provider : existing.provider;
    if (willBeActive && !effectiveIsManual && !effectiveProvider) {
      return NextResponse.json({ error: "Impossible d'activer un moyen automatisé sans prestataire configuré (champ provider)." }, { status: 400 });
    }

    const data: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        if (field === 'displayOrder') data[field] = parseInt(body[field]);
        else if (field === 'isManual' || field === 'isActive') data[field] = Boolean(body[field]);
        else data[field] = body[field] === '' ? null : body[field];
      }
    }

    const method = await prisma.paymentMethod.update({ where: { id }, data });

    return NextResponse.json({ method });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}