import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminOrNull } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { NIVEAU_OPTIONS, getNiveauLabel } from '@/lib/niveau';

// Changement du niveau d'études d'un étudiant : RÉSERVÉ à l'administrateur
// (l'étudiant ne peut plus le modifier lui-même, voir /api/profil/update).
export async function POST(request: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const anneeEtude = Number.parseInt(String(body?.anneeEtude ?? ''), 10);
    if (!userId) return NextResponse.json({ error: 'Étudiant manquant.' }, { status: 400 });
    if (!NIVEAU_OPTIONS.some(o => o.value === anneeEtude)) return NextResponse.json({ error: "Niveau d'étude invalide." }, { status: 400 });

    const student = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!student || student.role !== 'ETUDIANT') return NextResponse.json({ error: 'Étudiant introuvable.' }, { status: 404 });

    await prisma.user.update({ where: { id: userId }, data: { anneeEtude } });
    await notifyUser(userId, `Ton niveau d'études a été mis à jour par l'administration : ${getNiveauLabel(anneeEtude)}.`, '🎓', { url: '/etudiant/profil' });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
