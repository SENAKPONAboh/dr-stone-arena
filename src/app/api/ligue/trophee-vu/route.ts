import { NextResponse } from 'next/server';
import { getCurrentUserCore } from '@/lib/auth';
import { markTrophyPopupSeen } from '@/lib/trophy-popup';

// Le joueur a fermé sa fenêtre de trophée : on ne la lui remontre plus.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const { key } = await request.json();
    await markTrophyPopupSeen(user.id, String(key ?? ''));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
