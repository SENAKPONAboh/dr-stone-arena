// ===== NOTIFICATIONS PUSH — envoi côté serveur (jamais bloquant, jamais d'exception) =====
import webpush from 'web-push';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export type PushPayload = { title: string; body: string; url?: string };
export type PushResult = {
  ok: boolean;
  reason?: 'NO_KEYS' | 'NO_SUBSCRIPTION' | 'EXPIRED' | 'ERROR';
  detail?: string;
};

function configure(): { ok: true } | { ok: false; detail: string } {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    return { ok: false, detail: `Clé manquante sur le serveur (${!pub ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' : ''}${!pub && !priv ? ' et ' : ''}${!priv ? 'VAPID_PRIVATE_KEY' : ''}).` };
  }
  try {
    webpush.setVapidDetails('mailto:contact@drstonearena.com', pub, priv);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: `Clés VAPID invalides : ${e?.message ?? e}` };
  }
}

/** Envoie une notification push à un étudiant. Nettoie l'abonnement s'il est expiré. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  try {
    const cfg = configure();
    if (!cfg.ok) return { ok: false, reason: 'NO_KEYS', detail: cfg.detail };

    const u = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } });
    if (!u?.pushSubscription) return { ok: false, reason: 'NO_SUBSCRIPTION' };

    try {
      await webpush.sendNotification(
        u.pushSubscription as any,
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/etudiant' }),
      );
      return { ok: true };
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        // Abonnement mort (app désinstallée, permission retirée) : on le supprime
        await prisma.user.update({ where: { id: userId }, data: { pushSubscription: Prisma.DbNull } }).catch(() => {});
        return { ok: false, reason: 'EXPIRED', detail: 'Abonnement expiré' };
      }
      return { ok: false, reason: 'ERROR', detail: `${e?.statusCode ?? ''} ${e?.body ?? e?.message ?? e}`.trim() };
    }
  } catch (e: any) {
    return { ok: false, reason: 'ERROR', detail: String(e?.message ?? e) };
  }
}
