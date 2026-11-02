import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { deleteUsersCompletely } from '@/lib/delete-users';

// ⚠️ SUPPRESSION DÉFINITIVE d'UN compte depuis « Gestion des étudiants » (compte en double, mal créé…),
// y compris un inscrit du lancement. Son numéro WhatsApp est effacé avec lui et redevient libre.
// Jamais un compte ADMIN ni l'admin connecté.
const CONFIRM_WORD = 'SUPPRIMER';

export async function POST(request: Request) {
  const admin = await getCurrentUserCore();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { userId, confirmation } = await request.json();
    if (confirmation !== CONFIRM_WORD) {
      return NextResponse.json({ error: "Tape SUPPRIMER pour confirmer." }, { status: 400 });
    }
    if (typeof userId !== 'string' || userId === admin.id) {
      return NextResponse.json({ error: "Compte invalide." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!target) return NextResponse.json({ error: "Compte introuvable (déjà supprimé ?)." }, { status: 404 });
    if (target.role === 'ADMIN') return NextResponse.json({ error: "Un compte ADMIN ne peut pas être supprimé ici." }, { status: 400 });

    await deleteUsersCompletely([target.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur pendant la suppression : rien n'a été supprimé." }, { status: 500 });
  }
}
