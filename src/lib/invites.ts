// ===== INVITATIONS CONTRE DES VIES — Dr. Stone Arena =====
// Chaque étudiant a un lien personnel : drstonearena.com/register?invite=CODE.
// Un ami qui s'inscrit avec ce lien PUIS joue son 1er cas donne +3 vies à celui qui l'a invité,
// une seule fois par ami, jusqu'à 30 vies au maximum (au-delà du maximum normal de 10).
// Tout est « non bloquant » : si le SQL des tables n'a pas encore été exécuté, rien ne casse.
import { randomInt } from 'crypto';
import prisma from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';

export const INVITE_REWARD_LIVES = 3;
export const INVITE_LIVES_CAP = 30;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans O/0/I/1 (faciles à confondre)

function newCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

const tableMissing = (e: any) => e?.code === 'P2021' || /InviteCode|LifeInvite/.test(String(e?.message));

/** Code d'invitation de l'étudiant (créé au premier besoin). null si les tables n'existent pas encore. */
export async function getOrCreateInviteCode(userId: string): Promise<string | null> {
  try {
    const existing = await prisma.inviteCode.findUnique({ where: { userId }, select: { code: true } });
    if (existing) return existing.code;
    for (let i = 0; i < 5; i++) {
      try {
        const created = await prisma.inviteCode.create({ data: { userId, code: newCode() } });
        return created.code;
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
        // Deux onglets en même temps : le code existe peut-être déjà pour cet étudiant
        const again = await prisma.inviteCode.findUnique({ where: { userId }, select: { code: true } });
        if (again) return again.code;
      }
    }
    return null;
  } catch (e) {
    if (!tableMissing(e)) console.error('Code d\'invitation :', e);
    return null;
  }
}

/** Nombre d'amis invités (inscrits) et d'invitations déjà récompensées. */
export async function getInviteStats(userId: string): Promise<{ joined: number; rewarded: number }> {
  try {
    const [joined, rewarded] = await Promise.all([
      prisma.lifeInvite.count({ where: { inviterId: userId } }),
      prisma.lifeInvite.count({ where: { inviterId: userId, rewardedAt: { not: null } } }),
    ]);
    return { joined, rewarded };
  } catch {
    return { joined: 0, rewarded: 0 };
  }
}

/** À l'inscription : relie le nouveau compte à celui qui l'a invité. Ne fait jamais échouer l'inscription. */
export async function recordInvite(inviteeId: string, rawCode: unknown) {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase().slice(0, 12) : '';
  if (!code) return;
  try {
    const owner = await prisma.inviteCode.findUnique({ where: { code }, select: { userId: true } });
    if (!owner || owner.userId === inviteeId) return;
    await prisma.lifeInvite.create({ data: { inviterId: owner.userId, inviteeId } });
  } catch (e: any) {
    if (!tableMissing(e) && e?.code !== 'P2002') console.error('Invitation (inscription) :', e);
  }
}

/** Après un cas joué : si c'est le 1er cas d'un invité, l'inviteur reçoit ses +3 vies (une seule fois). */
export async function rewardInviterIfDue(inviteeId: string) {
  try {
    const invite = await prisma.lifeInvite.findUnique({
      where: { inviteeId },
      select: { id: true, inviterId: true, rewardedAt: true, invitee: { select: { prenom: true, pseudo: true } } },
    });
    if (!invite || invite.rewardedAt) return;

    const given = await prisma.$transaction(async (tx) => {
      // Marquage atomique : deux cas envoyés en même temps ne donnent pas deux fois les vies
      const claimed = await tx.lifeInvite.updateMany({ where: { id: invite.id, rewardedAt: null }, data: { rewardedAt: new Date() } });
      if (claimed.count !== 1) return false;
      // +3 vies, plafond 30 ; l'horloge de régénération s'arrête si on repasse à 10 vies ou plus
      await tx.$executeRaw`
        UPDATE "User"
        SET "lives" = GREATEST("lives", LEAST(${INVITE_LIVES_CAP}, "lives" + ${INVITE_REWARD_LIVES})),
            "lastLifeLostAt" = CASE WHEN LEAST(${INVITE_LIVES_CAP}, "lives" + ${INVITE_REWARD_LIVES}) >= 10 THEN NULL ELSE "lastLifeLostAt" END
        WHERE "id" = ${invite.inviterId}`;
      return true;
    });

    if (given) {
      const name = invite.invitee.pseudo || invite.invitee.prenom || 'Ton ami';
      await notifyUser(invite.inviterId, `${name} a rejoint l'Arena grâce à toi et a joué son premier cas : +${INVITE_REWARD_LIVES} vies !`, '❤️', { url: '/etudiant' });
    }
  } catch (e) {
    if (!tableMissing(e)) console.error('Invitation (récompense) :', e);
  }
}
