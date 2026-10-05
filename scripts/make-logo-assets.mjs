// Génère toutes les images du logo à partir du fichier d'origine (fond noir) :
//   node scripts/make-logo-assets.mjs "chemin/vers/logo.webp"
// - public/logo/mark.png      monogramme DS, fond transparent
// - public/logo/wordmark.png  « DOCTOR STONE ARENA » + devise, fond transparent
// - public/logo/logo-full.png logo complet, fond transparent
// - public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-icon.png : icônes d'installation (fond sombre)
import sharp from 'sharp';
import fs from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('Indique le fichier du logo.'); process.exit(1); }
const BG = { r: 4, g: 7, b: 14 }; // fond du logo d'origine

// Le fond est noir : on le convertit en transparence (alpha = luminosité max du pixel).
async function blackToAlpha(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.max(r, g, b);
    const a = Math.min(255, Math.max(0, (m - 30) * 1.35));
    if (a === 0) { out[i] = out[i + 1] = out[i + 2] = 0; out[i + 3] = 0; continue; }
    const k = 255 / m;
    out[i] = Math.min(255, r * k); out[i + 1] = Math.min(255, g * k); out[i + 2] = Math.min(255, b * k); out[i + 3] = a;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

fs.mkdirSync('public/logo', { recursive: true });
const full = await blackToAlpha(src);
const fullPng = await full.png().toBuffer();

const crop = async (rect) => {
  const part = await sharp(fullPng).extract(rect).png().toBuffer(); // d'abord découper, ensuite rogner les bords vides
  return sharp(part).trim({ threshold: 8 }).png().toBuffer();
};

// Monogramme (sans l'anneau ni le texte)
const markBuf = await crop({ left: 405, top: 245, width: 450, height: 470 });
const mk = await sharp(markBuf).metadata();
const side = Math.max(mk.width, mk.height);
const pad = Math.round(side * 0.12);
const markSquare = await sharp(markBuf)
  .extend({
    top: Math.floor((side - mk.height) / 2) + pad, bottom: Math.ceil((side - mk.height) / 2) + pad,
    left: Math.floor((side - mk.width) / 2) + pad, right: Math.ceil((side - mk.width) / 2) + pad,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .resize(512, 512).png().toBuffer();
fs.writeFileSync('public/logo/mark.png', markSquare);

// Nom + devise
const word = await crop({ left: 120, top: 730, width: 1010, height: 290 });
fs.writeFileSync('public/logo/wordmark.png', await sharp(word).resize({ width: 900 }).png().toBuffer());

// Logo complet
fs.writeFileSync('public/logo/logo-full.png', await sharp(fullPng).resize(1024, 1024).png().toBuffer());

// Icônes d'installation : monogramme centré sur le fond sombre
async function icon(size, ratio, file) {
  const m = await sharp(markBuf).resize({ width: Math.round(size * ratio), height: Math.round(size * ratio), fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: m, gravity: 'center' }])
    .png().toFile(file);
}
await icon(192, 0.66, 'public/icon-192.png');
await icon(512, 0.66, 'public/icon-512.png');
await icon(512, 0.5, 'public/icon-maskable-512.png'); // zone de sécurité des icônes « maskable »
await icon(180, 0.66, 'public/apple-icon.png');
console.log('Logo prêt.');
