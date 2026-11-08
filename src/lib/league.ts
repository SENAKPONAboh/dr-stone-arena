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
import { startTierFromXp, getOpenTiers, ensureProfile, creditUa, FREE_LEAGUE_DUELS, UA_DUEL_WIN, UA_DUEL_LOSS } from '@/lib/league-profile';

export { startTierFromXp, getOpenTiers };

export const LEAGUES = [
  { name: 'Bronze', color: '#e0a36a' },
  { name: 'Argent', color: '#dfe6ee' },
  { name: 'Or', color: '#f2c14e' },
  { name: 'Saphir', color: '#6f9bff' },
  { name: 'Rubis', color: '#ff5b86' },
  { name: 'Diamant', color: '#8ef0ff' },
] as const;

/** Premier lundi des ligues. Sur le vrai site (Vercel), rien n'est visible ni compté avant cette semaine ; en local, tout est testable. */
export const LEAGUE_START = '2026-11-09';
const IS_LOCAL = process.env.VERCEL !== '1';
export const leaguesOpen = () => IS_LOCAL || weekKey() >= LEAGUE_START;

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

/** Début de la semaine en cours : lundi 0 h à Niamey. */
export function weekStart(at = new Date()) {
  const [y, m, d] = weekKey(at).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - NIAMEY_MS);
}

/** Points des cas du jour déjà joués cette semaine (comptés à l'entrée en ligue). */
async function weekCasePoints(userId: string) {
  const agg = await prisma.attempt.aggregate({ where: { userId, createdAt: { gte: weekStart() } }, _sum: { xpEarned: true } });
  return Math.max(0, agg._sum.xpEarned ?? 0);
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

/** Clôture la semaine précédente si la tâche planifiée du dimanche ne l'a pas fait (appel léger, verrouillé). */
export async function closePreviousWeekIfNeeded() {
  try {
    const prev = weekKey(new Date(weekStart().getTime() - 3600000));
    const done = await prisma.leagueSetting.findUnique({ where: { key: `closed:${prev}` } });
    if (done) return;
    const any = await prisma.leagueMember.findFirst({ where: { week: prev }, select: { id: true } });
    if (!any) return;
    const { closeWeek } = await import('@/lib/league-close');
    await closeWeek(prev);
  } catch (e) {
    console.error('Ligue (clôture) :', e);
  }
}

/** Inscrit l'étudiant dans la ligue de la semaine (crée son profil et lui trouve un groupe). */
export async function ensureMember(userId: string): Promise<{ member: Awaited<ReturnType<typeof prisma.leagueMember.create>>; created: boolean }> {
  const week = weekKey();
  const existing = await prisma.leagueMember.findUnique({ where: { userId_week: { userId, week } } });
  if (existing) return { member: existing, created: false };

  await closePreviousWeekIfNeeded();
  const profile = await ensureProfile(userId);
  const tier = profile.tier;

  // Verrou par (semaine, ligue) : deux inscriptions simultanées ne remplissent pas le même groupe au-delà de 15
  // Rattrapage des cas déjà joués dans la semaine : UNIQUEMENT en local (tests d'Arthur). Sur le vrai site, tout le monde part de 0.
  const startPoints = IS_LOCAL ? await weekCasePoints(userId) : 0;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`league:${week}:${tier}`}))`;
    const again = await tx.leagueMember.findUnique({ where: { userId_week: { userId, week } } });
    if (again) return { member: again, created: false };
    const groups = await tx.leagueMember.groupBy({ by: ['groupNo'], where: { week, tier }, _count: { _all: true }, orderBy: { groupNo: 'asc' } });
    const open = groups.find((g) => g._count._all < GROUP_SIZE);
    const groupNo = open ? open.groupNo : (groups.length ? groups[groups.length - 1].groupNo + 1 : 1);
    const member = await tx.leagueMember.create({ data: { userId, week, tier, groupNo, points: startPoints } });
    return { member, created: true };
  });
}

/** Ajoute (ou retire) des points de ligue. Jamais sous 0. Prévient ceux qui viennent d'être dépassés. */
export async function addLeaguePoints(user: { id: string; prenom: string; pseudo: string | null }, delta: number, source: 'case' | 'duel' = 'case') {
  if (!delta || !leaguesOpen()) return;
  try {
    const { member, created } = await ensureMember(user.id);
    if (created && source === 'case' && IS_LOCAL) {
      if (member.points > 0) await notifyLeagueOvertaken(user, member, 0, member.points);
      return; // (local) ce cas fait déjà partie des points de départ
    }
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
  if (!leaguesOpen()) return;
  try {
    const week = weekKey(), day = dayKey();
    const [ra, oa] = await Promise.all([
      prisma.user.findUnique({ where: { id: duel.requesterId }, select: { id: true, prenom: true, pseudo: true } }),
      prisma.user.findUnique({ where: { id: duel.opponentId }, select: { id: true, prenom: true, pseudo: true } }),
    ]);
    if (!ra || !oa) return;
    const [{ member: rm }, { member: om }] = await Promise.all([ensureMember(ra.id), ensureMember(oa.id)]);
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
      await addLeaguePoints(me, pts, 'duel');
      // Au-delà des 3 duels du jour (les duels « de ligue »), chaque duel rapporte aussi un peu d'UA de boutique
      if (countedToday >= FREE_LEAGUE_DUELS) await creditUa(me.id, won ? UA_DUEL_WIN : UA_DUEL_LOSS, 'DUEL', duel.id);
    }
  } catch (e) {
    console.error('Ligue (duel) :', e);
  }
}

export type LeagueRow = { userId: string; name: string; imageUrl: string | null; anneeEtude: number | null; points: number; tier: number; rank: number; me: boolean };
export type LeagueView =
  | { status: 'unavailable' }
  | { status: 'soon'; startsOn: string }
  | { status: 'waiting'; tier: number; stars: number; openTiers: number; endsAt: string; ua: number; chestUa: number; chestLabel: string | null; lastResult: string | null }
  | { status: 'active'; tier: number; stars: number; openTiers: number; endsAt: string; ua: number; chestUa: number; chestLabel: string | null; lastResult: string | null; groupNo: number; rows: LeagueRow[]; myRank: number; up: number; down: number; starZone: number };

/** Tout ce qu'il faut pour afficher la ligue de l'étudiant cette semaine. */
export async function getLeagueView(userId: string): Promise<LeagueView> {
  if (!leaguesOpen()) return { status: 'soon', startsOn: LEAGUE_START };
  try {
    const week = weekKey();
    // (Local seulement) a déjà joué des cas cette semaine sans être inscrit : on l'inscrit avec ces points
    if (IS_LOCAL && !(await prisma.leagueMember.findUnique({ where: { userId_week: { userId, week } }, select: { id: true } })) && (await weekCasePoints(userId)) > 0) {
      await ensureMember(userId);
    }
    const [openTiers, profile, member] = await Promise.all([
      getOpenTiers(),
      prisma.leagueProfile.findUnique({ where: { userId } }),
      prisma.leagueMember.findUnique({ where: { userId_week: { userId, week } } }),
    ]);
    const endsAt = weekEnd().toISOString();
    const prevWeek = weekKey(new Date(weekStart().getTime() - 3600000));
    const last = await prisma.leagueMember.findUnique({ where: { userId_week: { userId, week: prevWeek } }, select: { result: true } });
    const extra = { ua: profile?.ua ?? 0, chestUa: profile?.chestUa ?? 0, chestLabel: profile?.chestLabel ?? null, lastResult: last?.result ?? null };
    if (!member) {
      let tier = profile?.tier;
      if (tier === undefined) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
        tier = Math.min(openTiers - 1, startTierFromXp(u?.xp ?? 0));
      }
      return { status: 'waiting', tier, stars: profile?.stars ?? 0, openTiers, endsAt, ...extra };
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
      status: 'active', tier: member.tier, stars: profile?.stars ?? 0, openTiers, endsAt, ...extra, groupNo: member.groupNo, rows,
      myRank: rows.find((r) => r.me)?.rank ?? rows.length, up: z.up, down: z.down, starZone: z.stars,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export type LeagueOverview = { tier: number; players: number; top: { userId: string; name: string; imageUrl: string | null; anneeEtude: number | null; points: number }[] }[];

/** Toutes les ligues ouvertes cette semaine : nombre de joueurs et les 5 meilleurs (tous groupes confondus). */
export async function getLeaguesOverview(): Promise<LeagueOverview> {
  try {
    if (!leaguesOpen()) return [];
    const week = weekKey();
    const openTiers = await getOpenTiers();
    return await Promise.all(Array.from({ length: openTiers }, async (_, tier) => {
      const [players, top] = await Promise.all([
        prisma.leagueMember.count({ where: { week, tier } }),
        prisma.leagueMember.findMany({
          where: { week, tier }, orderBy: [{ points: 'desc' }, { updatedAt: 'asc' }], take: 5,
          select: { userId: true, points: true, user: { select: { prenom: true, pseudo: true, imageUrl: true, anneeEtude: true } } },
        }),
      ]);
      return { tier, players, top: top.map((m) => ({ userId: m.userId, name: m.user.pseudo || m.user.prenom, imageUrl: m.user.imageUrl, anneeEtude: m.user.anneeEtude, points: m.points })) };
    }));
  } catch {
    return [];
  }
}

// ===== MODE DÉMONSTRATION (LOCAL UNIQUEMENT, ?demo=1) : données fictives pour les captures du tutoriel vidéo =====
// Rien n'est lu ni écrit en base. Impossible sur le vrai site (Vercel).
export const demoAllowed = (demo?: string) => IS_LOCAL && demo === '1';
const DEMO_NAMES = ['Fatima', 'Ibrahim', 'Kofi', 'Grâce', 'Moussa', 'Aïcha', 'Kossi', 'Mariam', 'Sani', 'Hamza', 'Bénédicte', 'Yacine', 'Nadia', 'Paul'];
const DEMO_POINTS = [612, 540, 498, 455, 430, 402, 377, 340, 295, 260, 210, 185, 120, 64];
export function demoLeagueView(): LeagueView {
  const rows: LeagueRow[] = DEMO_NAMES.map((name, i) => ({
    userId: `demo-${i}`, name, imageUrl: null, anneeEtude: 3, points: DEMO_POINTS[i], tier: 1, rank: i + 1, me: name === 'Kofi',
  }));
  const z = zones(rows.length, 1, 3);
  return {
    status: 'active', tier: 1, stars: 0, openTiers: 3, endsAt: weekEnd().toISOString(), ua: 12400, chestUa: 3000, chestLabel: 'Coffre de montée en Argent',
    lastResult: 'MONTE', groupNo: 1, rows, myRank: 3, up: z.up, down: z.down, starZone: z.stars,
  };
}
export function demoOverview(): LeagueOverview {
  const t = (names: string[], pts: number[]) => names.map((name, i) => ({ userId: `d-${name}`, name, imageUrl: null, anneeEtude: (i % 6) + 1, points: pts[i] }));
  return [
    { tier: 0, players: 46, top: t(['Junior', 'Inès', 'Rachid', 'Sena', 'Mariam'], [702, 655, 610, 588, 540]) },
    { tier: 1, players: 28, top: t(['Fatima', 'Ibrahim', 'Kofi', 'Grâce', 'Moussa'], [612, 540, 498, 455, 430]) },
    { tier: 2, players: 15, top: t(['Nadia', 'Yacine', 'Paul', 'Aïcha', 'Kevin'], [890, 845, 790, 760, 702]) },
  ];
}
