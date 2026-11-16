// TROPHÉE DES 3 PREMIERS DE LA LIGUE OR (semaine du 9 au 15 novembre 2026) : +75 XP chacun + fenêtre de félicitations.
//
//   node scripts/trophee-or.mjs          -> SIMULATION (affiche les 3 joueurs, n'écrit rien)
//   node scripts/trophee-or.mjs --apply  -> donne les 75 XP, prépare la fenêtre et la notification (une seule fois)
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const WEEK = '2026-11-09';
const XP = 75;
const KEY = `popup:trophee-or-${WEEK}`;
const LOCK = `xp:trophee-or-${WEEK}`;
const prisma = new PrismaClient();

async function main() {
  if (await prisma.leagueSetting.findUnique({ where: { key: LOCK } })) { console.log('Déjà fait : les 75 XP ont déjà été donnés.'); return; }
  const rows = await prisma.leagueMember.findMany({
    where: { week: WEEK, tier: 2, result: 'ETOILE' }, orderBy: { rank: 'asc' },
    select: { userId: true, rank: true, points: true, user: { select: { prenom: true, nom: true, pseudo: true, xp: true } } },
  });
  if (rows.length === 0) { console.log('Aucun joueur trouvé.'); return; }
  for (const r of rows) console.log(`  ${r.rank}. ${r.user.pseudo || `${r.user.prenom} ${r.user.nom}`} — ${r.points} pts · XP ${r.user.xp} -> ${r.user.xp + XP}`);
  if (!APPLY) { console.log('\nSIMULATION : rien n’a été écrit. Pour appliquer : node scripts/trophee-or.mjs --apply'); return; }

  const value = JSON.stringify({
    title: 'Les 3 premiers de la Ligue Or',
    subtitle: 'Bravo ! Tu as terminé dans le top 3 de la Ligue Or (semaine du 9 au 15 novembre). Ce trophée récompense ton travail : continue, la ligue Saphir t’attend !',
    xp: XP,
    players: rows.map((r) => ({ id: r.userId, rank: r.rank })),
  });
  // Transaction « en lot » (un seul aller-retour) : la transaction interactive expirait sur la connexion d'Arthur (P2028).
  await prisma.$transaction([
    ...rows.map((r) => prisma.user.update({ where: { id: r.userId }, data: { xp: { increment: XP } } })),
    ...rows.map((r) => prisma.notification.create({ data: { userId: r.userId, icon: '🏆', message: `🏆 Trophée : tu fais partie des 3 premiers de la Ligue Or ! +${XP} XP t’ont été offerts.` } })),
    prisma.leagueSetting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } }),
    prisma.leagueSetting.create({ data: { key: LOCK, value: new Date().toISOString() } }),
  ]);
  console.log(`\nAPPLIQUÉ : +${XP} XP donnés à ${rows.length} joueurs ; la fenêtre s’affichera à leur prochaine connexion.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
