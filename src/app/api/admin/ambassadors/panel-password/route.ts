import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// Admin : efface le mot de passe du panel d'un ambassadeur qui l'a oublié.
// À sa prochaine visite, il devra en choisir un nouveau.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  try {
    const { ambassadorId } = await request.json();
    if (typeof ambassadorId !== 'string') return NextResponse.json({ error: 'Ambassadeur manquant' }, { status: 400 });
    await prisma.ambassadorPanelAccess.deleteMany({ where: { ambassadorId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Impossible (la table d'accès n'est peut-être pas encore créée)." }, { status: 500 });
  }
}
