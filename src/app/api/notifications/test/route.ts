import { NextResponse } from 'next/server';
import { getCurrentUserCore } from '@/lib/auth';
import { sendPushToUser } from '@/lib/push';

// Envoie une notification de test à CET utilisateur et explique précisément ce qui ne va pas, le cas échéant.
export async function POST() {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const r = await sendPushToUser(user.id, {
    title: '🔔 Test réussi !',
    body: 'Les notifications fonctionnent sur cet appareil.',
    url: '/etudiant',
  });
  if (r.ok) return NextResponse.json({ success: true });

  const messages: Record<string, string> = {
    NO_KEYS: "Les notifications ne sont pas configurées côté serveur. " + (r.detail ?? ''),
    NO_SUBSCRIPTION: "Cet appareil n'est pas enregistré. Désactive puis réactive les notifications.",
    EXPIRED: "L'enregistrement de cet appareil avait expiré. Réactive les notifications.",
    ERROR: `Envoi impossible. ${r.detail ?? ''}`,
  };
  return NextResponse.json({ error: messages[r.reason ?? 'ERROR'], reason: r.reason }, { status: 400 });
}
