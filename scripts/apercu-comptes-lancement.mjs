// APERÇU AVANT LE LANCEMENT : montre quels comptes seront gardés et lesquels seront supprimés
// par prisma/sql/2026-lancement-suppression-comptes-test.sql.
//
//   node scripts/apercu-comptes-lancement.mjs
//
// LECTURE SEULE : uniquement des findMany / count, rien n'est écrit dans la base.
// La liste des comptes à garder est lue directement dans le fichier SQL (entre les repères
// « COMPTES A GARDER »), pour que l'aperçu et la suppression utilisent exactement la même liste.
// Prérequis : DATABASE_URL défini (le .env du projet, lu automatiquement par Prisma).
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL_FILE = join(process.cwd(), 'prisma', 'sql', '2026-lancement-suppression-comptes-test.sql');
const DATE_LIMITE = new Date('2026-11-01T23:00:00Z'); // même valeur que dans le fichier SQL (2 nov., 0 h à Niamey)

const sql = readFileSync(SQL_FILE, 'utf8');
const block = sql.split('-- >>> COMPTES A GARDER (début)')[1]?.split('-- <<< COMPTES A GARDER (fin)')[0];
if (block === undefined) {
  console.error('Repères « COMPTES A GARDER » introuvables dans le fichier SQL.');
  process.exit(1);
}
const idents = [...block.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
const norm = (s) => (s ?? '').trim().toLowerCase();

const prisma = new PrismaClient();
const fmt = (d) => d.toISOString().slice(0, 10);
const label = (u) => `${(u.pseudo || '—').padEnd(18)} ${u.email.padEnd(34)} ${u.role.padEnd(9)} créé le ${fmt(u.createdAt)}`;

try {
  const users = await prisma.user.findMany({
    select: { id: true, pseudo: true, email: true, role: true, createdAt: true, prenom: true, nom: true },
    orderBy: { createdAt: 'asc' },
  });

  let bloquant = false;
  console.log('\n=== Comptes que tu as listés ===');
  if (idents.length === 0 || idents.includes('A_REMPLACER')) {
    console.log("  ⚠ La liste n'est pas encore remplie (A_REMPLACER) : le script SQL refusera de tourner.");
    bloquant = true;
  }
  for (const id of idents.filter((i) => i !== 'A_REMPLACER')) {
    const hits = users.filter((u) => norm(u.email) === norm(id) || norm(u.pseudo) === norm(id));
    if (hits.length === 1) console.log(`  ✔ ${id.padEnd(30)} → ${hits[0].prenom} ${hits[0].nom} (${hits[0].email})`);
    else if (hits.length === 0) { console.log(`  ✖ ${id.padEnd(30)} → INTROUVABLE (faute de frappe ?)`); bloquant = true; }
    else { console.log(`  ✖ ${id.padEnd(30)} → ${hits.length} comptes ont ce pseudo : écris plutôt l'e-mail`); bloquant = true; }
  }

  const keepSet = new Set(idents.map(norm));
  const kept = users.filter((u) => u.role === 'ADMIN' || keepSet.has(norm(u.email)) || (u.pseudo && keepSet.has(norm(u.pseudo))));
  const keptIds = new Set(kept.map((u) => u.id));
  const doomed = users.filter((u) => !keptIds.has(u.id));
  const doomedIds = doomed.map((u) => u.id);

  console.log(`\n=== GARDÉS (${kept.length}) ===`);
  for (const u of kept) console.log('  ' + label(u));

  console.log(`\n=== SUPPRIMÉS DÉFINITIVEMENT (${doomed.length}) ===`);
  for (const u of doomed) console.log('  ' + label(u));

  const tardifs = doomed.filter((u) => u.createdAt >= DATE_LIMITE);
  if (tardifs.length) {
    console.log(`\n  ✖ ${tardifs.length} compte(s) à supprimer créés après le 2 novembre : le script SQL refusera de tourner.`);
    bloquant = true;
  }
  if (!users.some((u) => u.role === 'ADMIN')) { console.log('\n  ✖ Aucun compte ADMIN trouvé.'); bloquant = true; }

  if (doomedIds.length) {
    const inD = { userId: { in: doomedIds } };
    const [attempts, duels, messages, premium, pass, recharges, retraits, ambassadeurs] = await Promise.all([
      prisma.attempt.count({ where: inD }),
      prisma.duel.count({ where: { OR: [{ requesterId: { in: doomedIds } }, { opponentId: { in: doomedIds } }] } }),
      prisma.directMessage.count({ where: { OR: [{ senderId: { in: doomedIds } }, { recipientId: { in: doomedIds } }] } }),
      prisma.premiumRequest.groupBy({ by: ['status'], where: inD, _count: true }),
      prisma.passRequest.groupBy({ by: ['status'], where: inD, _count: true }),
      prisma.rechargeRequest.groupBy({ by: ['status'], where: inD, _count: true }),
      prisma.withdrawalRequest.groupBy({ by: ['status'], where: inD, _count: true }),
      prisma.ambassador.count({ where: inD }),
    ]);
    const parStatut = (rows) => rows.length ? rows.map((r) => `${r._count} ${r.status}`).join(', ') : 'aucun';
    console.log('\n=== Ce qui part avec eux ===');
    console.log(`  Tentatives de cas : ${attempts}   Duels : ${duels}   Messages : ${messages}   Profils ambassadeur : ${ambassadeurs}`);
    console.log(`  Reçus Premium : ${parStatut(premium)}`);
    console.log(`  Reçus Pass Élite : ${parStatut(pass)}`);
    console.log(`  Recharges UA : ${parStatut(recharges)}`);
    console.log(`  Retraits (Prime Arena) : ${parStatut(retraits)}`);
    const argent = [...premium, ...pass, ...recharges].some((r) => r.status === 'VALIDE')
      || retraits.some((r) => ['EN_ATTENTE', 'EN_TRAITEMENT'].includes(r.status));
    if (argent) console.log("  ⚠ Il y a des paiements validés ou des retraits en cours : vérifie que ce n'est pas de l'argent réel avant de supprimer.");
  }

  console.log(bloquant
    ? '\n➜ À CORRIGER avant de lancer la suppression (voir les ✖ ci-dessus).'
    : '\n➜ Tout est prêt. Si les deux listes sont justes, tu peux lancer le fichier SQL.');
} catch (e) {
  console.error('\nÉCHEC de l\'aperçu :', e.message);
  console.error('Vérifie ta connexion Internet puis relance la commande.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
