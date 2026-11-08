// ===== LIGUES DE LA SEMAINE — Dr. Stone Arena (prisma/sql/2026-ligues.sql) =====
// Points de ligue SÉPARÉS de l'XP, remis à 0 chaque lundi (heure de Niamey, UTC+1).
// - Ligue de départ (une seule fois) selon l'XP du mois : ≥ 650 → Or, ≥ 250 → Argent, sinon Bronze.
// - On entre dans un groupe de ~15 joueurs de sa ligue au premier point de la semaine.
// - Cas du jour : + l'XP gagnée / − l'XP perdue (jamais sous 0). Duels : +30, +100 contre une ligue au-dessus, +5 si perdu ;
//   1 duel compté par adversaire et par semaine ; au-delà de 5 duels comptés dans la journée, points divisés par 2.
// - La clôture du dimanche (montée / descente / étoiles / coffres) est faite par la tâche planifiée (à venir).
// Tout est NON BLOQUANT : si les tables n'existent pas encore (SQL pas exécuté), rien ne casse.
import prisma from '@/lib/prisma';
import { pushOnly } from '@/lib/notify';

export const LEAGUES = [
  { name: 'Bronze', color: '#e0a36a' },
  { name: 'Argent', color: '#dfe6ee' },
  { name: 'Or', color: '#f2c14e' },
  { name: 'Saphir', color: '#6f9bff' },
  { name: 'Rubis', color: '#ff5b86' },
  { name: 'Diamant', color: '#8ef0ff' },
] as const;

export const GROUP_SIZE = 15;
export const STAR_TOP = 3;           // dans la plus haute ligue ouverte : les 3 premiers gagnent une étoile
export const DUEL_WIN = 30;
export const DUEL_WIN_HIGHER = 100;
export const DUEL_LOSS = 5;
export const DUELS_FULL_POINTS = 5;  // au-delà, points divisés par 2
const OVERTAKE_MAX_PER_DAY = 2;
const LEAGUE_ICON = '🏅';

const NIAMEY_MS = 3600000;
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Jour à l'heure de Niamey, ex. "2026-11-09". */
export function dayKey(at = new Date()) {
  return ymd(new Date(at.getTime() + NIAMEY_MS));
}
/** Semaine = date du lundi (heure de Niamey). */
export function weekKey(at = new Date()) {
  const local = new Date(at.getTime() + NIAMEY_MS);
  const dow = (local.getUTCDay() + 6) % 7; // lundi = 0
  return ymd(new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow)));
}
/** Fin de la semaine en cours : dimanche 23:59:59 à Niamey. */
export function weekEnd(at = new Date()) {
  const [y, m, d] = weekKey(at).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 7) - NIAMEY_MS - 1000);
}

/** Ligue de départ (une seule fois) d'après l'XP du mois. */
export function startTierFromXp(xp: number) {
  return xp >= 650 ? 2 : xp >= 250 ? 1 : 0;
}

export async function getOpenTiers(): Promise<number> {
  try {
    const s = await prisma.leagueSetting.findUnique({ where: { key: 'openTiers' } });
    const n = Number(s?.value);
    return Number.isFinite(n) && n >= 1 ? Math.min(6, n) : 3;
  } catch {
    return 3;
  }
}

/** Nombre de places qui montent / descendent / gagnent une étoile dans un groupe de n joueurs. */
export function zones(n: number, tier: number, openTiers: number) {
  const fifth = n >= 5 ? Math.round(n / 5) : n >= 2 ? 1 : 0;
  const isTop = tier >= openTiers - 1;
  return {
    up: isTop ? 0 : fifth,
    stars: isTop ? Math.min(STAR_TOP, Math.max(0, n - 1)) : 0,
    down: tier > 0 && n >= 4 ? fifth : 0,
  };
}

/** Inscrit l'étudiant dans la ligue de la semaine (crée son profil et lui trouve un groupe). */
export async function ensureMember(userId: string) {
  const week = weekKey();
  const existing = await prisma.leagueMember.findUnique({ where: { userId_week: { userId, week } } });
  if (existing) return existing;

  const openTiers = await getOpenTiers();
  let profile = await prisma.leagueProfile.findUnique({ where: { userId } });
  if (!profile) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    const tier = Math.min(openTiers - 1, startTierFromXp(u?.xp ?? 0));
    profile = await prisma.leagueProfile.upsert({ where: { userId }, update: {}, create: { userId, tier } });
  }
  const tier = profile.tier;

  // Verrou par (semaine, ligue) : deux inscriptions simultanées ne remplissent pas le même groupe au-delà de 15
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`league:${week}:${tier}`}))`;
    const again = await tx.leagueMember.findUnique({ where: { userId_week: { userId, week } } });
    if (again) return again;
    const groups = await tx.leagueMember.groupBy({ by: ['groupNo'], where: { week, tier }, _count: { _all: true }, orderBy: { groupNo: 'asc' } });
    const open = groups.find((g) => g._count._all < GROUP_SIZE);
    const groupNo = open ? open.groupNo : (groups.length ? groups[groups.length - 1].groupNo + 1 : 1);
    return tx.leagueMember.create({ data: { userId, week, tier, groupNo } });
  });
}

/** Ajoute (ou retire) des points de ligue. Jamais sous 0. Prévient ceux qui viennent d'être dépassés. */
export async function addLeaguePoints(user: { id: string; prenom: string; pseudo: string | null }, delta: number) {
  if (!delta) return;
  try {
    const member = await ensureMember(user.id);
    const before = member.points;
    const rows = await prisma.$queryRaw<{ points: number }[]>`
      UPDATE "LeagueMember" SET "points" = GREATEST("points" + ${delta}, 0), "updatedAt" = NOW()
      WHERE "id" = ${member.id} RETURNING "points"`;
    const after = rows[0]?.points ?? before;
    if (after > before) await notifyLeagueOvertaken(user, member, before, after);
  } catch (e) {
    console.error('Ligue (points) :', e);
  }
}

async function notifyLeagueOvertaken(
  user: { id: string; prenom: string; pseudo: string | null },
  member: { week: string; tier: number; groupNo: number },
  before: number,
  after: number,
) {
  const today = dayKey();
  const victims = await prisma.leagueMember.findMany({
    where: { week: member.week, tier: member.tier, groupNo: member.groupNo, userId: { not: user.id }, points: { gte: before, lt: after } },
    select: { id: true, userId: true, overtakeDay: true, overtakeCount: true },
    take: 15,
  });
  const name = user.pseudo || user.prenom;
  for (const v of victims) {
    const count = v.overtakeDay === today ? v.overtakeCount : 0;
    if (count >= OVERTAKE_MAX_PER_DAY) continue;
    await prisma.leagueMember.update({ where: { id: v.id }, data: { overtakeDay: today, overtakeCount: count + 1 } });
    await pushOnly(v.userId, `${name} vient de te dépasser dans ta ligue ! Un cas réussi et tu reprends ta place.`, LEAGUE_ICON,
      { title: `${LEAGUE_ICON} Ligue ${LEAGUES[member.tier].name}`, url: '/etudiant/ligue' });
  }
}

/** Points de ligue d'un duel terminé, pour les deux joueurs (une seule fois par duel). */
export async function creditLeagueDuel(duel: { id: string; requesterId: string; opponentId: string; winnerId: string | null }) {
  try {
    const week = weekKey(), day = dayKey();
    const [ra, oa] = await Promise.all([
      prisma.user.findUnique({ where: { id: duel.requesterId }, select: { id: true, prenom: true, pseudo: true } }),
      prisma.user.findUnique({ where: { id: duel.opponentId }, select: { id: true, prenom: true, pseudo: true } }),
    ]);
    if (!ra || !oa) return;
    const [rm, om] = await Promise.all([ensureMember(ra.id), ensureMember(oa.id)]);
    for (const [me, other, myTier, otherTier] of [[ra, oa, rm.tier, om.tier], [oa, ra, om.tier, rm.tier]] as const) {
      const already = await prisma.leagueDuelCredit.findFirst({ where: { userId: me.id, opponentId: other.id, week } });
      if (already) continue; // 1 duel compté par adversaire et par semaine
      const countedToday = await prisma.leagueDuelCredit.count({ where: { userId: me.id, day } });
      const won = duel.winnerId === me.id;
      let pts = won ? (otherTier > myTier ? DUEL_WIN_HIGHER : DUEL_WIN) : DUEL_LOSS;
      if (countedToday >= DUELS_FULL_POINTS) pts = Math.floor(pts / 2);
      try {
        await prisma.leagueDuelCredit.create({ data: { duelId: duel.id, userId: me.id, opponentId: other.id, week, day, points: pts } });
      } catch {
        continue; // déjà compté (double appel)
      }
      await addLeaguePoints(me, pts);
    }
  } catch (e) {
    console.error('Ligue (duel) :', e);
  }
}

export type LeagueRow = { userId: string; name: string; imageUrl: string | null; anneeEtude: number | null; points: number; tier: number; rank: number; me: boolean };
export type LeagueView =
  | { status: 'unavailable' }
  | { status: 'waiting'; tier: number; stars: number; openTiers: number; endsAt: string }
  | { status: 'active'; tier: number; stars: number; openTiers: number; endsAt: string; groupNo: number; rows: LeagueRow[]; myRank: number; up: number; down: number; starZone: number };

/** Tout ce qu'il faut pour afficher la ligue de l'étudiant cette semaine. */
export async function getLeagueView(userId: string): Promise<LeagueView> {
  try {
    const week = weekKey();
    const [openTiers, profile, member] = await Promise.all([
      getOpenTiers(),
      prisma.leagueProfile.findUnique({ where: { userId } }),
      prisma.leagueMember.findUnique({ where: { userId_week: { userId, week } } }),
    ]);
    const endsAt = weekEnd().toISOString();
    if (!member) {
      let tier = profile?.tier;
      if (tier === undefined) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
        tier = Math.min(openTiers - 1, startTierFromXp(u?.xp ?? 0));
      }
      return { status: 'waiting', tier, stars: profile?.stars ?? 0, openTiers, endsAt };
    }
    const members = await prisma.leagueMember.findMany({
      where: { week, tier: member.tier, groupNo: member.groupNo },
      orderBy: [{ points: 'desc' }, { updatedAt: 'asc' }],
      select: { userId: true, points: true, tier: true, user: { select: { prenom: true, pseudo: true, imageUrl: true, anneeEtude: true } } },
    });
    const rows: LeagueRow[] = members.map((m, i) => ({
      userId: m.userId, name: m.user.pseudo || m.user.prenom, imageUrl: m.user.imageUrl, anneeEtude: m.user.anneeEtude,
      points: m.points, tier: m.tier, rank: i + 1, me: m.userId === userId,
    }));
    const z = zones(rows.length, member.tier, openTiers);
    return {
      status: 'active', tier: member.tier, stars: profile?.stars ?? 0, openTiers, endsAt, groupNo: member.groupNo, rows,
      myRank: rows.find((r) => r.me)?.rank ?? rows.length, up: z.up, down: z.down, starZone: z.stars,
    };
  } catch {
    return { status: 'unavailable' };
  }
}
