// SAUVEGARDE DE LA BASE : copie toutes les tables de la base de production dans un dossier local.
//
//   node scripts/sauvegarde-base.mjs     (ou : npm.cmd run sauvegarde)
//
// LECTURE SEULE : le script ne fait que des findMany, il n'écrit jamais dans la base.
// Résultat : sauvegardes/AAAA-MM-JJ_HHhMM/<Table>.jsonl.gz (une ligne JSON par enregistrement, compressé)
// + resume.json (nombre de lignes par table). Le dossier sauvegardes/ est ignoré par git :
// il contient des données personnelles (numéros, mots de passe chiffrés), ne jamais l'envoyer à personne.
// Prérequis : DATABASE_URL défini (le .env du projet, lu automatiquement par Prisma).
import { PrismaClient, Prisma } from '@prisma/client';
import { createWriteStream, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { join } from 'node:path';

const BATCH = 2000;
const prisma = new PrismaClient();

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
const dir = join(process.cwd(), 'sauvegardes', stamp);
mkdirSync(dir, { recursive: true });

// BigInt n'est pas sérialisable en JSON : on l'écrit en texte.
const replacer = (_k, v) => (typeof v === 'bigint' ? v.toString() : v);

function writeLine(stream, line) {
  return stream.write(line) ? Promise.resolve() : new Promise((r) => stream.once('drain', r));
}

async function dumpModel(model) {
  const delegate = prisma[model.name.charAt(0).toLowerCase() + model.name.slice(1)];
  const idFields = model.primaryKey?.fields ?? model.fields.filter((f) => f.isId).map((f) => f.name);
  const orderBy = idFields.map((f) => ({ [f]: 'asc' }));

  const file = join(dir, `${model.name}.jsonl.gz`);
  const gzip = createGzip();
  const out = createWriteStream(file);
  gzip.pipe(out);
  const done = new Promise((resolve, reject) => { out.on('finish', resolve); out.on('error', reject); });

  let count = 0;
  for (let skip = 0; ; skip += BATCH) {
    const rows = await delegate.findMany({ orderBy, skip, take: BATCH });
    for (const row of rows) await writeLine(gzip, JSON.stringify(row, replacer) + '\n');
    count += rows.length;
    if (rows.length < BATCH) break;
  }
  gzip.end();
  await done;
  return count;
}

const resume = { date: now.toISOString(), tables: {} };
let total = 0;
try {
  for (const model of Prisma.dmmf.datamodel.models) {
    const count = await dumpModel(model);
    resume.tables[model.name] = count;
    total += count;
    console.log(`  ${model.name.padEnd(24)} ${count} ligne(s)`);
  }
  writeFileSync(join(dir, 'resume.json'), JSON.stringify(resume, null, 2));
  const size = Prisma.dmmf.datamodel.models
    .reduce((s, m) => s + statSync(join(dir, `${m.name}.jsonl.gz`)).size, 0);
  console.log(`\nSauvegarde terminée : ${total} lignes, ${(size / 1024 / 1024).toFixed(1)} Mo`);
  console.log(`Dossier : ${dir}`);
  console.log('Copie ce dossier sur une clé USB ou ton Google Drive personnel. Ne l\'envoie à personne.');
} catch (e) {
  console.error('\nÉCHEC de la sauvegarde :', e.message);
  console.error('Vérifie ta connexion Internet puis relance la commande.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
