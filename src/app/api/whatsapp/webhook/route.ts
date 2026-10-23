import { NextResponse } from 'next/server';
import { handleIncomingCode, sendWhatsappText, validSignature, whatsappVerifyEnabled } from '@/lib/whatsapp-verify';
import { notifyUser } from '@/lib/notify';

// 🔗 Webhook WhatsApp (Meta) : adresse à coller dans Meta → WhatsApp → Configuration :
//    https://dr-stone-arena.vercel.app/api/whatsapp/webhook

// 1) Poignée de main : Meta vérifie que l'adresse nous appartient (mot secret WHATSAPP_VERIFY_TOKEN).
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && process.env.WHATSAPP_VERIFY_TOKEN && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Interdit', { status: 403 });
}

// 2) Messages reçus sur le numéro d'Arena.
export async function POST(request: Request) {
  const raw = await request.text();
  // Sans signature valide de Meta : on ignore (sinon n'importe qui pourrait « vérifier » un numéro).
  if (!whatsappVerifyEnabled() || !validSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return new Response('Signature invalide', { status: 401 });
  }

  try {
    const body = JSON.parse(raw);
    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        for (const msg of change?.value?.messages ?? []) {
          if (msg?.type !== 'text' || !msg?.from) continue;
          const { outcome, userId } = await handleIncomingCode(String(msg.from), String(msg.text?.body ?? ''));
          if (outcome === 'VERIFIED' && userId) {
            await sendWhatsappText(msg.from, "✅ Numéro vérifié ! Bienvenue dans Dr Stone Arena. Retourne dans l'application, tout est prêt.");
            await notifyUser(userId, '✅ Ton numéro WhatsApp est vérifié. Merci !', '✅');
          } else if (outcome === 'ALREADY') {
            await sendWhatsappText(msg.from, '✅ Ton numéro est déjà vérifié. Tu peux retourner dans l\'application.');
          } else if (outcome === 'PHONE_TAKEN') {
            await sendWhatsappText(msg.from, '⚠️ Ce numéro WhatsApp est déjà relié à un autre compte Dr Stone Arena (un seul compte par numéro).');
          } else if (outcome === 'UNKNOWN_CODE') {
            await sendWhatsappText(msg.from, "❌ Code inconnu. Ouvre l'application, touche « Vérifier mon numéro » et envoie le message sans le modifier.");
          }
          // NO_CODE : message ordinaire (question, etc.) → aucune réponse automatique, tu le lis dans WhatsApp.
        }
      }
    }
  } catch (e) {
    console.error('Webhook WhatsApp :', e);
  }
  // Toujours 200 : sinon Meta renvoie le même message en boucle.
  return NextResponse.json({ ok: true });
}
