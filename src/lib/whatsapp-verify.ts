// ===== VÉRIFICATION AUTOMATIQUE DU NUMÉRO WHATSAPP — Dr. Stone Arena =====
// Principe : l'étudiant ENVOIE lui-même « Mon code Arena : 482913 » au numéro WhatsApp Business d'Arena.
// Meta transmet le message au site (webhook) avec le numéro de l'expéditeur : ce numéro est donc prouvé.
// Le code (calculé, jamais stocké) relie le message au bon compte.
//
// Variables à mettre dans Vercel (Settings → Environment Variables) — jamais dans le code :
//   WHATSAPP_TOKEN           jeton d'accès permanent (utilisateur système Meta)
//   WHATSAPP_PHONE_NUMBER_ID identifiant du numéro +227 95 31 34 71 dans Meta
//   WHATSAPP_VERIFY_TOKEN    mot secret choisi par Arthur, recopié dans Meta (configuration du webhook)
//   WHATSAPP_APP_SECRET      « Clé secrète de l'application » Meta (signature des messages reçus)
// Tant qu'elles manquent, la vérification est simplement désactivée (personne n'est bloqué).
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';

export function whatsappVerifyEnabled(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET);
}

/** Code à 6 chiffres propre à (compte, numéro). Le même à chaque affichage, impossible à deviner sans la clé du serveur. */
export function verificationCode(userId: string, phone: string): string {
  const h = crypto.createHmac('sha256', String(process.env.JWT_SECRET ?? '') + ':wa-verify').update(`${userId}|${phone}`).digest();
  return String(h.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

export function verificationMessage(code: string) {
  return `Mon code Arena : ${code}`;
}

/** Signature Meta (en-tête X-Hub-Signature-256) : prouve que le message vient vraiment de Meta. */
export function validSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const got = Buffer.from(header);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

/** Réponse WhatsApp à l'étudiant (dans la conversation qu'il vient d'ouvrir). Jamais bloquant. */
export async function sendWhatsappText(toDigits: string, body: string) {
  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toDigits, type: 'text', text: { body } }),
    });
  } catch (e) {
    console.error('Réponse WhatsApp impossible :', e);
  }
}

export type VerifyOutcome = 'VERIFIED' | 'ALREADY' | 'NO_CODE' | 'UNKNOWN_CODE' | 'PHONE_TAKEN';

/**
 * Traite un message reçu. `fromDigits` = numéro de l'expéditeur donné par Meta (chiffres, sans « + »).
 * 1) Le numéro déclaré à l'inscription correspond et le code est le bon → vérifié.
 * 2) Sinon, on cherche à quel compte non vérifié appartient ce code (WhatsApp peut écrire certains numéros
 *    autrement que l'étudiant, ex. anciens/nouveaux formats) → le numéro RÉEL de l'expéditeur remplace
 *    le numéro tapé, s'il n'appartient pas déjà à un autre compte.
 */
export async function handleIncomingCode(fromDigits: string, text: string): Promise<{ outcome: VerifyOutcome; userId?: string }> {
  const code = text.match(/\b(\d{6})\b/)?.[1];
  if (!code) return { outcome: 'NO_CODE' };
  const sender = '+' + fromDigits.replace(/\D/g, '');

  const own = await prisma.userPhone.findUnique({ where: { phone: sender } });
  if (own && verificationCode(own.userId, own.phone) === code) {
    if (own.verifiedAt) return { outcome: 'ALREADY', userId: own.userId };
    await prisma.userPhone.update({ where: { userId: own.userId }, data: { verifiedAt: new Date() } });
    return { outcome: 'VERIFIED', userId: own.userId };
  }

  const pending = await prisma.userPhone.findMany({ where: { verifiedAt: null }, select: { userId: true, phone: true } });
  const match = pending.find(p => verificationCode(p.userId, p.phone) === code);
  if (!match) return { outcome: 'UNKNOWN_CODE' };
  if (own && own.userId !== match.userId) return { outcome: 'PHONE_TAKEN' };
  await prisma.userPhone.update({ where: { userId: match.userId }, data: { phone: sender, verifiedAt: new Date() } });
  return { outcome: 'VERIFIED', userId: match.userId };
}
