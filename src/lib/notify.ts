// ===== NOTIFIER UN ÉTUDIANT : cloche de l'application + notification sur le téléphone =====
// Règle : tout ce qui arrive dans la cloche part AUSSI en notification push (si l'étudiant l'a activée).
// Le push n'est jamais bloquant : une erreur d'envoi n'empêche jamais l'action de réussir.
import prisma from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push';

export type NotifyOptions = { title?: string; url?: string };

function pushTitle(icon: string, title?: string) {
  return title ?? `${icon} Dr Stone Arena`.trim();
}

/** Cloche + push. */
export async function notifyUser(userId: string, message: string, icon: string, opts: NotifyOptions = {}) {
  await prisma.notification.create({ data: { userId, message, icon } });
  await pushOnly(userId, message, icon, opts);
}

/** Push seul : pour une notification déjà écrite dans la cloche (ex. à l'intérieur d'une transaction),
 *  à appeler APRÈS la transaction pour ne rien envoyer si elle est annulée. */
export async function pushOnly(userId: string, message: string, icon: string, opts: NotifyOptions = {}) {
  await sendPushToUser(userId, { title: pushTitle(icon, opts.title), body: message, url: opts.url ?? '/etudiant' });
}

/** Push vers plusieurs étudiants (par paquets de 20 pour ne pas saturer le serveur). */
export async function pushMany(userIds: string[], message: string, icon: string, opts: NotifyOptions = {}) {
  for (let i = 0; i < userIds.length; i += 20) {
    await Promise.all(userIds.slice(i, i + 20).map(id => pushOnly(id, message, icon, opts)));
  }
}

/** Cloche + push pour plusieurs étudiants. */
export async function notifyMany(userIds: string[], message: string, icon: string, opts: NotifyOptions = {}) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({ data: userIds.map(userId => ({ userId, message, icon })) });
  await pushMany(userIds, message, icon, opts);
}
