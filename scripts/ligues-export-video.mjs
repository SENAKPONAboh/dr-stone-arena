// EXPORT POUR LA VIDÉO « Ceux qui montent » (LECTURE SEULE, n'écrit rien dans la base).
// Copie pseudo / pays / année / points / photo des joueurs MONTE et ETOILE de la dernière semaine clôturée
// vers le projet vidéo : public/ligues-montee/*.{webp,png,jpg} + data/ligues-montee.json
//
//   node scripts/ligues-export-video.mjs            -> dernière semaine clôturée
//   node scripts/ligues-export-video.mjs 2026-11-09 -> semaine précise
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const VIDEO = 'C:/Users/OMNIBOOK/dr-stone-arena-video';
const IMG_DIR = path.join(VIDEO, 'public/ligues-montee');
const LIGUES = ['BRONZE', 'ARGENT', 'OR', 'SAPHIR', 'RUBIS', 'DIAMANT'];
const prisma = new PrismaClient();

async function main() {
  let week = process.argv[2];
  if (!week) {
    const s = await prisma.leagueMember.groupBy({ by: ['week'], where: { result: { not: null } }, orderBy: { week: 'desc' }, take: 1 });
    week = s[0]?.week;
  }
  if (!week) { console.log('Aucune semaine clôturée.'); return; }
  const rows = await prisma.leagueMember.findMany({
    where: { week, result: { in: ['MONTE', 'ETOILE'] } },
    orderBy: [{ tier: 'asc' }, { groupNo: 'asc' }, { rank: 'asc' }],
    select: { tier: true, groupNo: true, rank: true, points: true, result: true,
      user: { select: { id: true, prenom: true, nom: true, pseudo: true, pays: true, anneeEtude: true, imageUrl: true } } },
  });
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const out = [];
  rows.forEach((r, i) => {
    const u = r.user;
    let img = null;
    const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/s.exec(u.imageUrl || '');
    if (m) {
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const file = `p${String(i + 1).padStart(2, '0')}.${ext}`;
      fs.writeFileSync(path.join(IMG_DIR, file), Buffer.from(m[2], 'base64'));
      img = `ligues-montee/${file}`;
    }
    out.push({
      name: (u.pseudo || `${u.prenom} ${u.nom}`).trim(),
      fullName: `${u.prenom} ${u.nom}`.trim(),
      from: LIGUES[r.tier], to: r.result === 'MONTE' ? LIGUES[r.tier + 1] : LIGUES[r.tier],
      result: r.result, group: r.groupNo, rank: r.rank, points: r.points,
      annee: u.anneeEtude, pays: u.pays, img, imgHttp: !m && u.imageUrl ? u.imageUrl : null,
    });
  });
  fs.writeFileSync(path.join(VIDEO, 'data/ligues-montee.json'), JSON.stringify({ week, players: out }, null, 1));
  console.log(`Semaine ${week} : ${out.length} joueurs exportés, ${out.filter((p) => p.img).length} photos.`);
  for (const p of out) console.log(`  ${p.result === 'ETOILE' ? '★' : '↑'} ${p.name} (${p.pays ?? '?'}) ${p.from} → ${p.to}${p.img ? '' : '  [pas de photo]'}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
