import { NextResponse } from 'next/server';
import { getCurrentUserCore } from '@/lib/auth';
import { markSaphirAnnouncementSeen } from '@/lib/saphir-bonus';

// Le joueur a fermé la fenêtre « Top 3 Saphir » : on ne la lui remontre plus.
export async function POST() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    await markSaphirAnnouncementSeen(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
