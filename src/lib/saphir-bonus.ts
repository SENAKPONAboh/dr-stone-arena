// ===== BONUS « TOP 3 SAPHIR » DE LA SEMAINE DU 16 NOVEMBRE 2026 =====
// 1) Les 3 meilleurs de la ligue Saphir de cette semaine-là reçoivent +100 points de ligue,
//    ajoutés à leurs points de la semaine en cours (une seule fois par joueur).
// 2) TOUS les joueurs voient une fois une fenêtre d'annonce à la connexion ; fermée, elle ne revient plus.
// Aucune nouvelle table : tout est noté dans LeagueSetting (clés « bonus:… » et « vu:… »).
// Tout est NON BLOQUANT : une erreur n'empêche jamais l'accueil de s'afficher.
import prisma from '@/lib/prisma';
import { ensureMember } from '@/lib/league';

export const SAPHIR_WEEK = '2026-11-16';
const SAPHIR_TIER = 3;
export const SAPHIR_BONUS = 100;
const BONUS_KEY = `bonus:saphir-top3:${SAPHIR_WEEK}`;
export const SAPHIR_SEEN_PREFIX = `vu:annonce-saphir:${SAPHIR_WEEK}:`;

export type SaphirWinner = { userId: string; name: string; stars: number };

/** Les 3 premiers de la ligue Saphir de la semaine (tous groupes confondus, au moins 1 point). */
export async function getSaphirTop3(): Promise<SaphirWinner[]> {
  const top = await prisma.leagueMember.findMany({
    where: { week: SAPHIR_WEEK, tier: SAPHIR_TIER, points: { gt: 0 } },
    orderBy: [{ points: 'desc' }, { updatedAt: 'asc' }],
    take: 3,
    select: { userId: true, user: { select: { prenom: true, pseudo: true, leagueProfile: { select: { stars: true } } } } },
  });
  return top.map((m) => ({ userId: m.userId, name: m.user.pseudo || m.user.prenom, stars: m.user.leagueProfile?.stars ?? 0 }));
}

/** Donne les +100 points aux 3 premiers, une seule fois par joueur (clé « bonus:…:<id> » posée avant l'ajout). */
export async function grantSaphirBonusOnce() {
  try {
    const done = await prisma.leagueSetting.findUnique({ where: { key: BONUS_KEY } });
    if (done) return;
    const winners = await getSaphirTop3();
    for (const w of winners) {
      const claimed = await prisma.leagueSetting.createMany({
        data: [{ key: `${BONUS_KEY}:${w.userId}`, value: new Date().toISOString() }], skipDuplicates: true,
      });
      if (claimed.count === 0) continue; // déjà reçu
      const { member } = await ensureMember(w.userId); // inscrit dans la ligue de la semaine en cours si besoin
      await prisma.$executeRaw`UPDATE "LeagueMember" SET "points" = "points" + ${SAPHIR_BONUS}, "updatedAt" = NOW() WHERE "id" = ${member.id}`;
    }
    await prisma.leagueSetting.createMany({
      data: [{ key: BONUS_KEY, value: JSON.stringify({ at: new Date().toISOString(), winners: winners.map((w) => w.userId) }) }], skipDuplicates: true,
    });
  } catch (e) {
    console.error('Bonus Saphir :', e);
  }
}

/** Fenêtre d'annonce à montrer à ce joueur (null s'il l'a déjà fermée). */
export async function getSaphirAnnouncement(userId: string): Promise<SaphirWinner[] | null> {
  try {
    const seen = await prisma.leagueSetting.findUnique({ where: { key: `${SAPHIR_SEEN_PREFIX}${userId}` }, select: { key: true } });
    if (seen) return null;
    const winners = await getSaphirTop3();
    return winners.length ? winners : null;
  } catch {
    return null;
  }
}

export async function markSaphirAnnouncementSeen(userId: string) {
  await prisma.leagueSetting.createMany({ data: [{ key: `${SAPHIR_SEEN_PREFIX}${userId}`, value: new Date().toISOString() }], skipDuplicates: true });
}
