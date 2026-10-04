// COMPRESSION DES PHOTOS DE PROFIL EXISTANTES
// Les anciennes photos étaient stockées en taille réelle (jusqu'à 2 Mo chacune) dans la base : les pages de
// classement les rechargeaient toutes. Ce script les réduit à 256×256 (WebP, ~10 Ko).
//
//   node scripts/compress-avatars.mjs            -> SIMULATION (n'écrit rien, affiche le gain)
//   node scripts/compress-avatars.mjs --apply    -> écrit les photos réduites (seul le champ imageUrl change)
//
// Prérequis : DATABASE_URL défini (utilise la base de l'application).
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: { imageUrl: { startsWith: 'data:image' } },
  select: { id: true, prenom: true, nom: true, imageUrl: true },
});

let before = 0;
let after = 0;
let done = 0;
for (const u of users) {
  const size = u.imageUrl.length;
  before += size;
  if (size < 40_000) { after += size; continue; } // déjà petite
  try {
    const raw = Buffer.from(u.imageUrl.split(',')[1] ?? '', 'base64');
    const out = await sharp(raw, { failOn: 'none' }).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    const uri = `data:image/webp;base64,${out.toString('base64')}`;
    after += uri.length;
    done++;
    if (APPLY) await prisma.user.update({ where: { id: u.id }, data: { imageUrl: uri } });
  } catch (e) {
    after += size;
    console.log(`  ignorée (illisible) : ${u.prenom} ${u.nom}`);
  }
}

const mo = (n) => (n / 1024 / 1024).toFixed(2) + ' Mo';
console.log(APPLY ? '=== APPLIQUÉ ===' : '=== SIMULATION (rien n\'est écrit) ===');
console.log(`Photos : ${users.length} | à réduire : ${done} | poids total ${mo(before)} -> ${mo(after)}`);
await prisma.$disconnect();
