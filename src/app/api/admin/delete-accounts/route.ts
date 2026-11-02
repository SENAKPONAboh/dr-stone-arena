import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { LAUNCH_PROTECTION_DATE } from '@/lib/launch-protection';
import { deleteUsersCompletely } from '@/lib/delete-users';

// ⚠️ SUPPRESSION DÉFINITIVE des comptes de test choisis par l'admin dans la Zone dangereuse.
// Le client envoie la liste EXACTE des comptes qu'il a vus et décochés (deleteIds) : un compte créé
// pendant que la page était ouverte n'est donc jamais supprimé par erreur.
// Toujours protégés côté serveur : les comptes ADMIN, l'admin connecté et les comptes créés
// à partir du lancement (vrais étudiants).
const CONFIRM_WORD = 'SUPPRIMER';

export async function POST(request: Request) {
  const admin = await getCurrentUserCore();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (body.confirmation !== CONFIRM_WORD) {
      return NextResponse.json({ error: "Confirmation invalide." }, { status: 400 });
    }
    const requested: unknown = body.deleteIds;
    if (!Array.isArray(requested) || requested.some(id => typeof id !== 'string')) {
      return NextResponse.json({ error: "Liste de comptes invalide." }, { status: 400 });
    }

    const targets = await prisma.user.findMany({
      where: {
        id: { in: requested as string[], not: admin.id },
        role: { not: 'ADMIN' },
        createdAt: { lt: LAUNCH_PROTECTION_DATE },
      },
      select: { id: true },
    });
    const ids = targets.map(t => t.id);
    if (ids.length === 0) {
      return NextResponse.json({ error: "Aucun compte à supprimer." }, { status: 400 });
    }

    const result = await deleteUsersCompletely(ids);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur pendant la suppression : rien n'a été supprimé." }, { status: 500 });
  }
}
