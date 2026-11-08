// ===== LIGUES : CLÔTURE DE LA SEMAINE (dimanche minuit, heure de Niamey) =====
// Pour chaque groupe : rang final, puis
//   - environ 1 sur 5 MONTE d'une ligue (coffre d'UA selon la nouvelle ligue) ;
//   - dans la plus haute ligue ouverte, les 3 premiers gagnent une ÉTOILE (et un coffre) ;
//   - environ 1 sur 5 DESCEND (jamais sous Bronze) ; les autres RESTENT.
// Ensuite, si la plus haute ligue ouverte compte au moins 24 joueurs, la ligue suivante ouvre :
// les 12 qui ont le plus d'étoiles y entrent (ex aequo ensemble) et les étoiles de cette ligue repartent à zéro.
// Appelée par la tâche planifiée (/api/cron/ligues) et, par sécurité, à la première inscription de la semaine suivante.
// Idempotente : un réglage « closed:<semaine> » empêche de clôturer deux fois.
import prisma from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';
import { LEAGUES, zones } from '@/lib/league';
import { getOpenTiers, addChest, UA_CHEST_BY_TIER, UA_STAR_CHEST } from '@/lib/league-profile';

const OPEN_NEXT_AT = 24;   // joueurs dans la plus haute ligue ouverte pour ouvrir la suivante
const OPEN_NEXT_SEATS = 12;

export async function closeWeek(week: string) {
  // Verrou global : une seule clôture à la fois
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`league-close:${week}`}))`;
    const done = await tx.leagueSetting.findUnique({ where: { key: `closed:${week}` } });
    if (done) return false;
    await tx.leagueSetting.create({ data: { key: `closed:${week}`, value: new Date().toISOString() } });
    return true;
  });
  if (!claimed) return { closed: false };

  const openTiers = await getOpenTiers();
  const members = await prisma.leagueMember.findMany({
    where: { week },
    orderBy: [{ tier: 'asc' }, { groupNo: 'asc' }, { points: 'desc' }, { updatedAt: 'asc' }],
    select: { id: true, userId: true, tier: true, groupNo: true, points: true },
  });

  const groups = new Map<string, typeof members>();
  for (const m of members) {
    const k = `${m.tier}:${m.groupNo}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }

  let moved = 0;
  for (const list of groups.values()) {
    const n = list.length, tier = list[0].tier;
    const z = zones(n, tier, openTiers);
    for (let i = 0; i < n; i++) {
      const m = list[i], rank = i + 1;
      let result = 'RESTE';
      if (m.points > 0 && rank <= z.up) result = 'MONTE';
      else if (m.points > 0 && rank <= z.stars) result = 'ETOILE';
      else if (z.down > 0 && rank > n - z.down) result = 'DESCEND';
      await prisma.leagueMember.update({ where: { id: m.id }, data: { rank, result } });

      if (result === 'MONTE') {
        const newTier = Math.min(tier + 1, openTiers - 1);
        await prisma.leagueProfile.update({ where: { userId: m.userId }, data: { tier: newTier } });
        await addChest(m.userId, UA_CHEST_BY_TIER[newTier], `Coffre de montée en ${LEAGUES[newTier].name}`);
        await notifyUser(m.userId, `🎉 Tu montes en ligue ${LEAGUES[newTier].name} ! Un coffre t'attend dans « Ma ligue ».`, '🏅', { url: '/etudiant/ligue' });
        moved++;
      } else if (result === 'ETOILE') {
        await prisma.leagueProfile.update({ where: { userId: m.userId }, data: { stars: { increment: 1 } } });
        await addChest(m.userId, UA_STAR_CHEST, `Coffre étoile ${LEAGUES[tier].name}`);
        await notifyUser(m.userId, `⭐ Tu gagnes une étoile en ligue ${LEAGUES[tier].name} ! Un coffre t'attend dans « Ma ligue ».`, '⭐', { url: '/etudiant/ligue' });
      } else if (result === 'DESCEND') {
        await prisma.leagueProfile.update({ where: { userId: m.userId }, data: { tier: Math.max(0, tier - 1) } });
        await notifyUser(m.userId, `Tu redescends en ligue ${LEAGUES[Math.max(0, tier - 1)].name}. Cette semaine, reprends ta place !`, '🏅', { url: '/etudiant/ligue' });
        moved++;
      }
    }
  }

  // Ouverture de la ligue suivante quand la plus haute est assez remplie
  let opened: string | null = null;
  if (openTiers < LEAGUES.length) {
    const top = openTiers - 1;
    const topPlayers = await prisma.leagueProfile.findMany({ where: { tier: top }, orderBy: [{ stars: 'desc' }, { updatedAt: 'asc' }], select: { userId: true, stars: true } });
    if (topPlayers.length >= OPEN_NEXT_AT) {
      const cut = topPlayers[OPEN_NEXT_SEATS - 1].stars;
      const enter = topPlayers.filter((p, i) => i < OPEN_NEXT_SEATS || p.stars === cut);
      await prisma.leagueSetting.upsert({ where: { key: 'openTiers' }, update: { value: String(openTiers + 1) }, create: { key: 'openTiers', value: String(openTiers + 1) } });
      await prisma.leagueProfile.updateMany({ where: { userId: { in: enter.map((p) => p.userId) } }, data: { tier: top + 1 } });
      await prisma.leagueProfile.updateMany({ where: { tier: top }, data: { stars: 0 } }); // les étoiles repartent à zéro
      await prisma.leagueProfile.updateMany({ where: { tier: top + 1 }, data: { stars: 0 } });
      for (const p of enter) {
        await addChest(p.userId, UA_CHEST_BY_TIER[top + 1], `Coffre d'ouverture ${LEAGUES[top + 1].name}`);
        await notifyUser(p.userId, `💎 La ligue ${LEAGUES[top + 1].name} est ouverte, et tu en fais partie grâce à tes étoiles !`, '🏅', { url: '/etudiant/ligue' });
      }
      opened = LEAGUES[top + 1].name;
    }
  }

  return { closed: true, members: members.length, moved, opened };
}
