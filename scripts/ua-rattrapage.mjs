// RATTRAPAGE UA : rejoue le journal UaTransaction de chaque joueur pour calculer
// la part « rechargée » (non retirable) de son solde actuel.
//
//   node scripts/ua-rattrapage.mjs            -> SIMULATION (lecture seule, aucun écrit)
//   node scripts/ua-rattrapage.mjs --apply    -> écrit User.uaRecharged (une transaction par joueur)
//   node scripts/ua-rattrapage.mjs --apply --notify -> écrit + envoie une notification aux joueurs concernés
//
// Rejouable : le résultat ne dépend que du journal, donc on peut le relancer juste avant la mise en ligne.
// Prérequis : colonnes ajoutées (prisma/sql/2026-economie-ua-1-colonnes.sql) et DATABASE_URL défini.
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const NOTIFY = process.argv.includes('--notify');
const prisma = new PrismaClient();

const SPEND_RECHARGED_FIRST = new Set(['ACHAT_BOUTIQUE', 'RETRY_RUSH']);

function replay(txs) {
  let bal = 0;
  let rech = 0;
  for (const t of txs) {
    const a = t.amount;
    if (a === 0) continue;
    if (a > 0) {
      bal += a;
      if (t.type === 'RECHARGE') rech += a; // recharge = non retirable ; tout autre crédit = mérite
    } else {
      const p = -a;
      const earned = Math.max(0, bal - rech);
      if (SPEND_RECHARGED_FIRST.has(t.type)) rech -= Math.min(rech, p);          // rechargées d'abord
      else rech -= Math.max(0, p - earned);                                        // retrait / correction : mérite d'abord
      bal = Math.max(0, bal - p);
      rech = Math.max(0, Math.min(rech, bal));
    }
  }
  return rech;
}

const users = await prisma.user.findMany({
  where: { OR: [{ uaBalance: { gt: 0 } }, { uaLocked: { gt: 0 } }, { passActive: true }] },
  select: { id: true, email: true, pseudo: true, prenom: true, nom: true, uaBalance: true, uaRecharged: true },
});

const rows = [];
for (const u of users) {
  const txs = await prisma.uaTransaction.findMany({ where: { userId: u.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { type: true, amount: true } });
  const recharged = Math.min(u.uaBalance, replay(txs));
  rows.push({ ...u, recharged, retirable: u.uaBalance - recharged, avant: u.uaBalance });
}

console.log(APPLY ? '=== APPLICATION ===' : '=== SIMULATION (aucun écrit) ===');
console.table(rows.map(r => ({
  joueur: r.pseudo || `${r.prenom} ${r.nom}`,
  solde_total: r.uaBalance,
  rechargé_calculé: r.recharged,
  retirable_après: r.retirable,
  déjà_en_base: r.uaRecharged,
})));
console.log(`Joueurs : ${rows.length} | total solde : ${rows.reduce((s, r) => s + r.uaBalance, 0)} | total rechargé : ${rows.reduce((s, r) => s + r.recharged, 0)}`);

if (APPLY) {
  for (const r of rows) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: r.id }, data: { uaRecharged: r.recharged } });
      if (NOTIFY && r.recharged > 0) {
        await tx.notification.create({
          data: {
            userId: r.id, icon: '⭐',
            message: `Nouveauté Espace Élite : tes UA sont maintenant séparées en points de mérite (gagnés par ton travail, convertibles en Prime Arena) et crédits de recharge (boutique et tentatives). Tu as ${r.retirable.toLocaleString('fr-FR')} points de mérite et ${r.recharged.toLocaleString('fr-FR')} crédits de recharge.`,
          },
        });
      }
    });
  }
  console.log('Terminé.');
}
await prisma.$disconnect();
