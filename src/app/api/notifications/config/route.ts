import { NextResponse } from 'next/server';
import { getCurrentUserCore } from '@/lib/auth';

// Lit les clés au moment de la requête (pas au moment de la construction du site) :
// la clé publique est faite pour être lue par le navigateur ; on indique seulement si la privée existe.
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const hasPrivate = !!process.env.VAPID_PRIVATE_KEY;
  return NextResponse.json({ publicKey, hasPublic: !!publicKey, hasPrivate });
}
