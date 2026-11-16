// RÉSULTATS DES LIGUES : qui est monté, qui est descendu (LECTURE SEULE, n'écrit rien).
//
//   node scripts/ligues-resultats.mjs              -> dernière semaine clôturée
//   node scripts/ligues-resultats.mjs 2026-11-09   -> une semaine précise (le lundi)
//   node scripts/ligues-resultats.mjs --toutes     -> toutes les semaines clôturées
import { PrismaClient } from '@prisma/client';

const LIGUES = ['Bronze', 'Argent', 'Or', 'Saphir', 'Rubis', 'Diamant'];
const prisma = new PrismaClient();
const arg = process.argv[2];

const nom = (u) => `${u.prenom} ${u.nom}`.trim() + (u.pseudo ? ` (@${u.pseudo})` : '') + (u.anneeEtude ? ` · ${u.anneeEtude}e année` : '');

async function main() {
  const semaines = (await prisma.leagueMember.groupBy({ by: ['week'], where: { result: { not: null } }, orderBy: { week: 'desc' } })).map((s) => s.week);
  if (semaines.length === 0) { console.log('Aucune semaine clôturée pour le moment.'); return; }
  const cibles = arg === '--toutes' ? semaines : [arg && !arg.startsWith('--') ? arg : semaines[0]];

  for (const week of cibles) {
    const rows = await prisma.leagueMember.findMany({
      where: { week, result: { in: ['MONTE', 'DESCEND', 'ETOILE'] } },
      orderBy: [{ tier: 'desc' }, { groupNo: 'asc' }, { rank: 'asc' }],
      select: { tier: true, groupNo: true, rank: true, points: true, result: true, user: { select: { prenom: true, nom: true, pseudo: true, anneeEtude: true } } },
    });
    console.log(`\n================ Semaine du ${week} ================`);
    for (const [res, titre, fleche] of [['MONTE', 'MONTÉS en ligue supérieure', '↑'], ['ETOILE', 'ÉTOILE gagnée (déjà dans la plus haute ligue ouverte)', '★'], ['DESCEND', 'DESCENDUS en ligue inférieure', '↓']]) {
      const liste = rows.filter((r) => r.result === res);
      console.log(`\n${titre} : ${liste.length}`);
      for (const r of liste) {
        const vers = res === 'MONTE' ? LIGUES[r.tier + 1] : res === 'DESCEND' ? LIGUES[r.tier - 1] : LIGUES[r.tier];
        console.log(`  ${fleche} ${nom(r.user)} — ${LIGUES[r.tier]} gr.${r.groupNo}, ${r.rank}e, ${r.points} pts → ${vers}`);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
