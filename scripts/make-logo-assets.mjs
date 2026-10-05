// Génère toutes les images du logo à partir du fichier d'origine (fond sombre avec décor) :
//   node scripts/make-logo-assets.mjs "chemin/vers/logo.webp"
// - public/logo/mark.png      monogramme DS + caducée + anneau, fond transparent
// - public/logo/wordmark.png  « DOCTOR STONE ARENA » + devise, fond transparent
// - public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-icon.png : icônes d'installation (fond sombre)
// - assets/logo/mark.png      copie lue par la carte de partage (serveur)
import sharp from 'sharp';
import fs from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('Indique le fichier du logo.'); process.exit(1); }
const BG = { r: 4, g: 8, b: 20 }; // bleu nuit des icônes

// Le fond est très sombre : on le convertit en transparence (alpha = luminosité max du pixel, avec un seuil).
async function darkToAlpha(buf, floor = 34, gain = 1.4) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.max(r, g, b);
    const a = Math.min(255, Math.max(0, (m - floor) * gain));
    if (a === 0) continue;
    const k = 255 / m;
    out[i] = Math.min(255, r * k); out[i + 1] = Math.min(255, g * k); out[i + 2] = Math.min(255, b * k); out[i + 3] = a;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

fs.mkdirSync('public/logo', { recursive: true });
fs.mkdirSync('assets/logo', { recursive: true });

// ---- Monogramme : on garde le cercle du logo (anneau bleu / or), on coupe le décor autour ----
const CX = 612, CY = 490, R = 372;            // cercle de l'anneau dans l'image d'origine
const X0 = 238, Y0 = 100, W = 748, H = 664;   // zone utile (au-dessus du texte)
const region = await sharp(src).extract({ left: X0, top: Y0, width: W, height: H }).png().toBuffer();
const circleMask = Buffer.from(
  `<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="${CX - X0}" cy="${CY - Y0}" r="${R}" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0.96" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs>` +
  `<rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
const masked = await sharp(region).composite([{ input: circleMask, blend: 'multiply' }]).png().toBuffer();
const markAlpha = await darkToAlpha(masked, 30, 1.4);
const side = Math.max(W, H);
const markSquare = await sharp(markAlpha)
  .extend({ top: Math.floor((side - H) / 2), bottom: Math.ceil((side - H) / 2), left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(640, 640).png().toBuffer();
fs.writeFileSync('public/logo/mark.png', markSquare);
fs.writeFileSync('assets/logo/mark.png', markSquare);

// ---- Nom + devise ----
const word = await sharp(src).extract({ left: 140, top: 775, width: 980, height: 255 }).png().toBuffer();
const wordAlpha = await darkToAlpha(word, 40, 1.5);
fs.writeFileSync('public/logo/wordmark.png', await sharp(wordAlpha).trim({ threshold: 6 }).resize({ width: 900 }).png().toBuffer());
if (fs.existsSync('public/logo/logo-full.png')) fs.unlinkSync('public/logo/logo-full.png');

// ---- Icônes d'installation : le monogramme sur fond bleu nuit ----
async function icon(size, ratio, file) {
  const px = Math.round(size * ratio);
  const m = await sharp(markSquare).resize(px, px).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: m, gravity: 'center' }]).png().toFile(file);
}
await icon(192, 0.9, 'public/icon-192.png');
await icon(512, 0.9, 'public/icon-512.png');
await icon(512, 0.66, 'public/icon-maskable-512.png'); // zone de sécurité des icônes « maskable »
await icon(180, 0.9, 'public/apple-icon.png');
console.log('Logo prêt.');
