// RÉORGANISATION DES LIGUES DU 16 NOVEMBRE 2026 : ouverture de SAPHIR + montée des 12 meilleurs de chaque ligue.
//
//   node scripts/ligues-reorganisation.mjs          -> SIMULATION (lecture seule : affiche qui va où, n'écrit rien)
//   node scripts/ligues-reorganisation.mjs --apply  -> applique (une seule fois : un verrou empêche de le refaire)
//
// Règles décidées avec Arthur :
//   - Or -> Saphir, Argent -> Or, Bronze -> Argent : les 12 meilleurs de chaque ligue montent d'un cran, en même temps
//     (calculé sur les ligues AVANT le déplacement : personne ne saute deux ligues).
//   - Seuls les joueurs ACTIFS (qui ont joué la semaine dernière ou cette semaine) ; classement = points de la semaine
//     dernière, puis points de cette semaine. Ceux qui viennent de monter dimanche (résultat MONTE) restent où ils sont.
//   - Les points déjà gagnés cette semaine sont gardés (la ligne de la semaine change seulement de ligue et de groupe).
//   - Chaque joueur qui monte reçoit le coffre de sa nouvelle ligue et une notification dans la cloche.
//   - Toutes les étoiles repartent à zéro ; Saphir devient la plus haute ligue ouverte.
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const SEATS = 12;
const LOCK = 'reorg:2026-11-16';
const LIGUES = ['Bronze', 'Argent', 'Or', 'Saphir', 'Rubis', 'Diamant'];
const UA_CHEST_BY_TIER = [0, 3000, 5000, 8000, 12000, 20000]; // identique à src/lib/league-profile.ts
const NIAMEY_MS = 3600000;
const prisma = new PrismaClient();

const ymd = (d) => d.toISOString().slice(0, 10);
function weekKey(at = new Date()) {
  const local = new Date(at.getTime() + NIAMEY_MS);
  const dow = (local.getUTCDay() + 6) % 7;
  return ymd(new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow)));
}
const nom = (u) => (u.pseudo || `${u.prenom} ${u.nom}`).trim();

async function main() {
  const week = weekKey();
  const prev = weekKey(new Date(Date.now() - 7 * 86400000));
  const lock = await prisma.leagueSetting.findUnique({ where: { key: LOCK } });
  if (lock) { console.log(`Déjà appliqué (${lock.value}). Rien à faire.`); return; }
  const open = Number((await prisma.leagueSetting.findUnique({ where: { key: 'openTiers' } }))?.value ?? 3) || 3;
  if (open !== 3) { console.log(`Ligues ouvertes = ${open} (attendu : 3). Arrêt par sécurité.`); return; }

  const [profiles, prevRows, curRows] = await Promise.all([
    prisma.leagueProfile.findMany({ select: { userId: true, tier: true, stars: true, user: { select: { prenom: true, nom: true, pseudo: true, role: true } } } }),
    prisma.leagueMember.findMany({ where: { week: prev }, select: { userId: true, points: true, result: true } }),
    prisma.leagueMember.findMany({ where: { week }, select: { id: true, userId: true, points: true, tier: true, groupNo: true, createdAt: true } }),
  ]);
  const P = new Map(prevRows.map((r) => [r.userId, r]));
  const Cu = new Map(curRows.map((r) => [r.userId, r]));

  console.log(`Semaine en cours : ${week} · semaine dernière : ${prev} · ${profiles.length} profils · ${curRows.length} déjà inscrits cette semaine\n`);
  const moves = [];
  for (const tier of [2, 1, 0]) {
    const inTier = profiles.filter((p) => p.tier === tier && p.user.role === 'ETUDIANT');
    const active = inTier.filter((p) => P.has(p.userId) || Cu.has(p.userId));
    const eligible = active.filter((p) => P.get(p.userId)?.result !== 'MONTE');
    eligible.sort((a, b) => (P.get(b.userId)?.points ?? 0) - (P.get(a.userId)?.points ?? 0) || (Cu.get(b.userId)?.points ?? 0) - (Cu.get(a.userId)?.points ?? 0));
    const up = eligible.slice(0, SEATS);
    console.log(`== ${LIGUES[tier]} -> ${LIGUES[tier + 1]} : ${up.length} montent (ligue : ${inTier.length} profils, ${active.length} actifs, ${active.length - eligible.length} viennent de monter et restent)`);
    up.forEach((p, i) => console.log(`   ${String(i + 1).padStart(2)}. ${nom(p.user)} — ${P.get(p.userId)?.points ?? 0} pts sem. dernière, ${Cu.get(p.userId)?.points ?? 0} pts cette semaine`));
    for (const p of up) moves.push({ userId: p.userId, from: tier, to: tier + 1, name: nom(p.user) });
  }

  // Effectifs actifs après déplacement (aperçu)
  const after = [0, 0, 0, 0];
  for (const p of profiles) {
    if (!(P.has(p.userId) || Cu.has(p.userId)) || p.user.role !== 'ETUDIANT') continue;
    const m = moves.find((x) => x.userId === p.userId);
    after[m ? m.to : Math.min(p.tier, 3)]++;
  }
  console.log(`\nJoueurs actifs après : Bronze ${after[0]} · Argent ${after[1]} · Or ${after[2]} · Saphir ${after[3]}`);
  console.log(`Étoiles remises à zéro : ${profiles.filter((p) => p.stars > 0).length} joueurs.`);

  if (!APPLY) { console.log('\nSIMULATION : rien n’a été écrit. Si la liste est bonne : node scripts/ligues-reorganisation.mjs --apply'); return; }

  await prisma.$transaction(async (tx) => {
    for (const m of moves) {
      await tx.leagueProfile.update({ where: { userId: m.userId }, data: { tier: m.to, chestUa: { increment: UA_CHEST_BY_TIER[m.to] }, chestLabel: `Coffre de montée en ${LIGUES[m.to]}` } });
      const cur = Cu.get(m.userId);
      if (cur) await tx.leagueMember.update({ where: { id: cur.id }, data: { tier: m.to } });
      await tx.notification.create({ data: { userId: m.userId, icon: '💎', message: m.to === 3 ? '💎 La ligue Saphir est ouverte, et tu en fais partie ! Un coffre t’attend dans « Ma ligue ».' : `🎉 Réorganisation des ligues : tu montes en ${LIGUES[m.to]} ! Un coffre t’attend dans « Ma ligue ».` } });
    }
    await tx.leagueProfile.updateMany({ data: { stars: 0 } });
    // Groupes de la semaine en cours, ligue par ligue (points gardés) : 1 groupe jusqu'à 20 joueurs, sinon des groupes d'environ 15
    const rows = await tx.leagueMember.findMany({ where: { week }, orderBy: { createdAt: 'asc' }, select: { id: true, tier: true } });
    for (const tier of [0, 1, 2, 3]) {
      const list = rows.filter((r) => r.tier === tier);
      const groups = list.length <= 20 ? 1 : Math.ceil(list.length / 15);
      const per = Math.ceil(list.length / groups) || 1;
      for (let i = 0; i < list.length; i++) await tx.leagueMember.update({ where: { id: list[i].id }, data: { groupNo: 1 + Math.floor(i / per) } });
    }
    await tx.leagueSetting.upsert({ where: { key: 'openTiers' }, update: { value: '4' }, create: { key: 'openTiers', value: '4' } });
    await tx.leagueSetting.create({ data: { key: LOCK, value: `appliqué le ${new Date().toISOString()} · ${moves.length} montées` } });
  }, { timeout: 120000 });
  console.log(`\nAPPLIQUÉ : Saphir ouverte, ${moves.length} joueurs montés, étoiles remises à zéro.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
