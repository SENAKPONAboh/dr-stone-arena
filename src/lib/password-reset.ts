// ===== MOT DE PASSE OUBLIÉ — par WhatsApp, sans e-mail ni table en base =====
// 1) L'étudiant tape son e-mail : on lui donne un message tout prêt « Mot de passe oublié Arena : 12345678 ».
// 2) Il l'ENVOIE au numéro WhatsApp d'Arena : Meta nous transmet son numéro (prouvé).
//    Si ce numéro est celui du compte et que le code est le bon → on lui répond avec un lien valable 30 min.
// 3) Le lien (jeton signé) ne sert qu'une fois : il contient une empreinte du mot de passe actuel,
//    qui ne correspond plus dès que le mot de passe a été changé.
// L'admin peut aussi créer ce lien depuis le panel (Gestion des étudiants → « Lien MDP »).
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

const LINK_MINUTES = 30;
const CODE_WINDOW_MS = 30 * 60 * 1000; // code valable pendant la fenêtre en cours et la précédente (30 à 60 min)
const encodedKey = new TextEncoder().encode(process.env.JWT_SECRET);

function hmac(label: string, data: string) {
  return crypto.createHmac('sha256', String(process.env.JWT_SECRET ?? '') + label).update(data).digest();
}

function codeFor(seed: string, windowIndex: number) {
  return String(hmac(':pwd-reset', `${seed}|${windowIndex}`).readUInt32BE(0) % 100_000_000).padStart(8, '0');
}

/** Code à 8 chiffres pour ce compte (ou un code factice pour un e-mail inconnu : on ne révèle pas qui est inscrit). */
export function resetCode(seed: string) {
  return codeFor(seed, Math.floor(Date.now() / CODE_WINDOW_MS));
}

export function resetMessage(code: string) {
  return `Mot de passe oublié Arena : ${code}`;
}

function passwordPrint(passwordHash: string) {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

/** Lien de réinitialisation (30 min, usage unique). */
export async function createResetLink(origin: string, user: { id: string; password: string }) {
  const token = await new SignJWT({ uid: user.id, pv: passwordPrint(user.password), purpose: 'pwd-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${LINK_MINUTES}m`)
    .sign(encodedKey);
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Vérifie le jeton : renvoie l'id du compte, ou null (expiré, falsifié ou déjà utilisé). */
export async function checkResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    if (payload.purpose !== 'pwd-reset' || typeof payload.uid !== 'string') return null;
    const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true, password: true, role: true } });
    if (!user || user.role === 'ADMIN' || passwordPrint(user.password) !== payload.pv) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Message WhatsApp reçu : s'il s'agit d'une demande de mot de passe, renvoie la réponse à envoyer, sinon null.
 * `fromDigits` = numéro de l'expéditeur donné par Meta (chiffres, sans « + »).
 */
export async function handleResetRequest(fromDigits: string, text: string, origin: string): Promise<string | null> {
  if (!/mot de passe/i.test(text)) return null;
  const code = text.match(/\b(\d{8})\b/)?.[1];
  if (!code) {
    return "Pour changer ton mot de passe : ouvre l'application, touche « Mot de passe oublié ? », tape ton e-mail puis envoie le message proposé sans le modifier.";
  }

  let phone: { userId: string } | null = null;
  try {
    phone = await prisma.userPhone.findUnique({ where: { phone: '+' + fromDigits.replace(/\D/g, '') }, select: { userId: true } });
  } catch { /* table pas encore créée */ }
  if (!phone) {
    return "⚠️ Ce numéro WhatsApp n'est relié à aucun compte Dr Stone Arena. Envoie le message depuis le numéro donné à ton inscription, ou touche « Contacter l'administration » dans l'application.";
  }

  const now = Math.floor(Date.now() / CODE_WINDOW_MS);
  if (code !== codeFor(phone.userId, now) && code !== codeFor(phone.userId, now - 1)) {
    return "❌ Code expiré ou incorrect (ou ce numéro n'est pas celui de ce compte). Recommence depuis « Mot de passe oublié ? » dans l'application.";
  }

  const user = await prisma.user.findUnique({ where: { id: phone.userId }, select: { id: true, password: true, role: true } });
  if (!user || user.role === 'ADMIN') {
    return "Ce compte ne peut pas être réinitialisé ici. Touche « Contacter l'administration » dans l'application.";
  }
  const link = await createResetLink(origin, user);
  return `🔑 Voici ton lien pour choisir un nouveau mot de passe (valable ${LINK_MINUTES} minutes, une seule fois) :\n${link}\n\nTu n'as rien demandé ? Ignore ce message, ton mot de passe ne change pas.`;
}
