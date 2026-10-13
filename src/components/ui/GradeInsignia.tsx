'use client';

import { useId, useMemo, type CSSProperties } from 'react';
import type { XpGrade } from '@/lib/grades';

// ===== INSIGNE DE GRADE (style rangs de Call of Duty Mobile) =====
// Hexagone en métal ciselé (facettes claires en haut / sombres en bas), chevrons militaires + croix médicale (grades 1-3),
// puis caducée ailé, ailes en lames, pointes, étoiles et halo qui grandissent avec le grade.
// Vivant : reflet qui balaie, braises (Maître), étincelles (Grand Maître), ÉCLAIRS qui crépitent sur l'insigne (Légende).
// Les pièces portent des classes gi-* : GradeUpOverlay les fait arriver une à une (assemblage).
// Le SVG est généré en texte à partir de nos propres données (aucune saisie utilisateur).

type Pal = { f: string; r: string; p: string; e: string; w: string | null };
const PAL: Pal[] = [
  { f: '#b8743d', r: '#6b4024', p: '#3a2213', e: '#f0c9a0', w: null },      // Novice : bronze
  { f: '#b9c3cf', r: '#5c6774', p: '#1d252f', e: '#ffffff', w: null },      // Interne : argent
  { f: '#e0b65c', r: '#8a6420', p: '#33260c', e: '#fff3c9', w: null },      // Diagnosticien : or
  { f: '#3fc4a6', r: '#c8d3dc', p: '#0b322c', e: '#e9fffa', w: '#9fb0bd' }, // Spécialiste : émeraude
  { f: '#9a6bf5', r: '#d6dbe6', p: '#23104d', e: '#f3eaff', w: '#b9c3d0' }, // Chirurgien : violet
  { f: '#e8572a', r: '#f2c14e', p: '#420f05', e: '#fff0c4', w: '#f2c14e' }, // Maître : feu
  { f: '#f2c14e', r: '#d4234a', p: '#3d0a18', e: '#fff6d6', w: '#f2c14e' }, // Grand Maître : or royal + rubis
  { f: '#a78bfa', r: '#f2c14e', p: '#170737', e: '#ffffff', w: '#f2c14e' }, // Légende : platine foudroyé
];
/** Couleur principale de l'insigne (halo, onde de choc…). */
export const insigniaColor = (index: number) => PAL[Math.max(0, Math.min(7, index))].f;

// Cadrage de chaque insigne (x, y, largeur, hauteur) : les ailes élargissent les grades du haut
const VB: [number, number, number, number][] = [
  [26, 12, 148, 186], [26, 12, 148, 186], [26, 12, 148, 186], [-8, 12, 216, 186],
  [-36, 6, 272, 192], [-52, -26, 304, 222], [-66, -26, 332, 236], [-86, -42, 372, 252],
];

type Pt = [number, number];
const LIGHT = (() => { const x = -0.55, y = -0.83, m = Math.hypot(x, y); return [x / m, y / m]; })();
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b), k = Math.max(0, Math.min(1, t));
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
};
const shade = (c: string, nx: number, ny: number) => {
  const d = nx * LIGHT[0] + ny * LIGHT[1];
  return d >= 0 ? mix(c, '#ffffff', d * 0.55) : mix(c, '#000000', -d * 0.62);
};
const P = (pts: Pt[]) => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const poly = (pts: Pt[], fill: string, extra = '') => `<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
const CX = 100, CY = 100;
const hex = (R: number, sy = 1.06): Pt[] => [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 3 * k - Math.PI / 2; return [CX + R * Math.cos(a), CY + R * sy * Math.sin(a)]; });

// Petit générateur pseudo-aléatoire déterministe : même dessin côté serveur et navigateur
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

/** Anneau ciselé : arête centrale, face extérieure éclairée selon sa normale, face intérieure inversée. */
function ridgeRing(R1: number, R2: number, c: string) {
  const O = hex(R1), M = hex((R1 + R2) / 2), I = hex(R2);
  let s = '';
  for (let k = 0; k < 6; k++) {
    const n = (k + 1) % 6, a = Math.PI / 3 * k - Math.PI / 2 + Math.PI / 6, nx = Math.cos(a), ny = Math.sin(a);
    s += poly([O[k], O[n], M[n], M[k]], shade(c, nx, ny)) + poly([M[k], M[n], I[n], I[k]], shade(c, -nx * 0.8, -ny * 0.8));
  }
  return s;
}
/** Barre ciselée : moitié éclairée, moitié dans l'ombre. */
function bar(A: Pt, B: Pt, w: number, c: string) {
  const dx = B[0] - A[0], dy = B[1] - A[1], m = Math.hypot(dx, dy), px = -dy / m * w / 2, py = dx / m * w / 2;
  const a1: Pt = [A[0] + px, A[1] + py], b1: Pt = [B[0] + px, B[1] + py], a2: Pt = [A[0] - px, A[1] - py], b2: Pt = [B[0] - px, B[1] - py];
  return poly([a1, b1, B, A], shade(c, px, py)) + poly([A, B, b2, a2], shade(c, -px, -py));
}
/** Lame / pointe ciselée en losange : base B, pointe T, demi-largeur w. */
function kite(B: Pt, T: Pt, w: number, c: string) {
  const dx = T[0] - B[0], dy = T[1] - B[1], m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m, px = -uy, py = ux;
  const S1: Pt = [B[0] + ux * m * 0.28 + px * w, B[1] + uy * m * 0.28 + py * w], S2: Pt = [B[0] + ux * m * 0.28 - px * w, B[1] + uy * m * 0.28 - py * w];
  const st = `stroke="${mix(c, '#000000', 0.65)}" stroke-width=".7" stroke-linejoin="round"`;
  return poly([B, S1, T], shade(c, px, py), st) + poly([B, T, S2], shade(c, -px, -py), st);
}
function star5(x: number, y: number, r: number, c: string) {
  let s = '';
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; s += kite([x, y], [x + r * Math.cos(a), y + r * Math.sin(a)], r * 0.36, c); }
  return s;
}
const chevron = (y: number, w: number, h: number, t: number, c: string) => bar([CX - w, y + h], [CX + 2, y - 1], t, c) + bar([CX - 2, y - 1], [CX + w, y + h], t, c);
const cross = (x: number, y: number, s: number, t: number, c: string) => bar([x, y - s], [x, y + s], t, c) + bar([x - s, y], [x + s, y], t, c);
function wing(side: number, n: number, len: number, c: string) {
  let s = '';
  for (let k = n - 1; k >= 0; k--) {
    const t = n === 1 ? 0.5 : k / (n - 1), th = (-12 + t * 78) * Math.PI / 180;
    const l = len * (0.78 + 0.32 * Math.sin(Math.PI * (0.25 + t * 0.6))), bx = CX + side * 54, by = CY + 14 - t * 40;
    s += kite([bx, by], [bx + side * Math.cos(th) * l, by - Math.sin(th) * l], 6 + len * 0.06, c);
  }
  return s;
}
function caduceus(c: string, legend: boolean) {
  const snake = (sx: number) => `<path d="M100 140 C${100 - 17 * sx} 136 ${100 - 17 * sx} 126 100 122 C${100 + 17 * sx} 118 ${100 + 17 * sx} 108 100 104 C${100 - 17 * sx} 100 ${100 - 17 * sx} 90 100 86 C${100 + 14 * sx} 82 ${100 + 12 * sx} 75 ${100 + 6 * sx} 72" fill="none"`;
  const dark = mix(c, '#000000', 0.65);
  let s = '';
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) s += kite([100 + sd * 4, 70 + k * 3], [100 + sd * (30 - k * 6), 58 + k * 7], 4.2, c);
  s += bar([100, 66], [100, 142], 7, c) + `<circle cx="100" cy="63" r="6" fill="${shade(c, -0.5, -0.8)}" stroke="${dark}" stroke-width=".8"/>`;
  for (const sx of [1, -1]) {
    s += `${snake(sx)} stroke="${dark}" stroke-width="6.5" stroke-linecap="round"/>${snake(sx)} stroke="${shade(c, -0.3 * sx, -0.6)}" stroke-width="4.2" stroke-linecap="round"/>`;
    s += `<circle cx="${100 + 6 * sx}" cy="72" r="3.3" fill="${shade(c, -0.4, -0.7)}" stroke="${dark}" stroke-width=".8"/>`;
  }
  if (legend) s += `<path d="M108 88 L94 108 H103 L97 124 L113 102 H104 Z" fill="#ffffff" stroke="#c4b5fd" stroke-width="1.2"/>`;
  return s;
}
function zigzag(r: () => number, x0: number, y0: number, x1: number, y1: number) {
  const pts: Pt[] = [[x0, y0]];
  for (let k = 1; k < 7; k++) { const t = k / 7; pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * 18, y0 + (y1 - y0) * t + (r() - 0.5) * 18]); }
  pts.push([x1, y1]);
  return P(pts);
}

function build(i: number, id: string, fx: boolean) {
  const g = PAL[i], deep = mix(g.f, '#000000', 0.78), r = rng(i * 7919 + 17);
  let s = `<defs>
    <radialGradient id="${id}p" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${mix(g.p, '#ffffff', 0.22)}"/><stop offset=".6" stop-color="${g.p}"/><stop offset="1" stop-color="${mix(g.p, '#000000', 0.6)}"/></radialGradient>
    <radialGradient id="${id}a" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${g.f}" stop-opacity=".7"/><stop offset=".55" stop-color="${g.f}" stop-opacity=".16"/><stop offset="1" stop-color="${g.f}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}g" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="${g.e}" stop-opacity=".35"/><stop offset="1" stop-color="${g.e}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}d" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".7"/></filter>
    <clipPath id="${id}c"><polygon points="${P(hex(78))}"/></clipPath>
  </defs>`;
  if (i >= 3) s += `<circle class="gi-pc gi-aura${fx ? ' gi-breathe' : ''}" cx="100" cy="100" r="${[0, 0, 0, 100, 112, 124, 134, 150][i]}" fill="url(#${id}a)"/>`;
  if (g.w) {
    const n = [0, 0, 0, 3, 4, 5, 5, 6][i], len = [0, 0, 0, 46, 66, 80, 92, 110][i];
    s += `<g class="gi-pc gi-wl" filter="url(#${id}d)">${wing(-1, n, len, g.w)}</g><g class="gi-pc gi-wr" filter="url(#${id}d)">${wing(1, n, len, g.w)}</g>`;
  }
  let spk = '';
  if (i >= 5) spk += kite([100, 30], [100, i === 7 ? -38 : -22], 11, g.r);
  if (i >= 6) spk += kite([80, 34], [62, i === 7 ? -18 : -8], 8, g.r) + kite([120, 34], [138, i === 7 ? -18 : -8], 8, g.r)
    + kite([84, 170], [70, 206], 7, g.w!) + kite([116, 170], [130, 206], 7, g.w!);
  if (spk) s += `<g class="gi-pc gi-spk" filter="url(#${id}d)">${spk}</g>`;
  s += `<g class="gi-pc gi-frame" filter="url(#${id}d)">${[9, 6, 3].map(d => `<polygon points="${P(hex(78))}" transform="translate(0 ${d})" fill="${deep}"/>`).join('')}${ridgeRing(78, 61, g.f)}</g>`;
  s += `<g class="gi-pc gi-ring">${ridgeRing(61, 53, g.r)}</g>`;
  let plate = `<polygon points="${P(hex(53))}" fill="url(#${id}p)"/><polygon points="${P(hex(45))}" fill="none" stroke="#fff" stroke-opacity=".08"/><circle cx="100" cy="98" r="40" fill="url(#${id}g)"/>`;
  hex(70).forEach(([x, y]) => { plate += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${shade(g.f, -0.5, -0.8)}" stroke="${mix(g.f, '#000000', 0.6)}" stroke-width=".7"/>`; });
  s += `<g class="gi-pc gi-plate">${plate}</g>`;
  let emb = '';
  if (i <= 2) {
    emb += cross(100, i === 2 ? 69 : 72, 12, 8, '#ff5470');
    for (let k = 0; k <= i; k++) emb += chevron(90 + k * 15, 26 - k * 2, 13, 8, g.e);
  } else emb += caduceus(g.e, i === 7);
  s += `<g class="gi-pc gi-emb" filter="url(#${id}d)">${emb}</g>`;
  const nS = [0, 0, 0, 0, 1, 2, 3, 3][i];
  if (nS) {
    const xs = nS === 1 ? [100] : nS === 2 ? [88, 112] : [76, 100, 124], sc = g.r === '#d4234a' ? '#f2c14e' : g.r;
    s += xs.map(x => `<g class="gi-pc gi-star" filter="url(#${id}d)">${star5(x, x === 100 && nS === 3 ? 176 : 172, x === 100 && nS === 3 ? 13 : 10, sc)}</g>`).join('');
  }
  s += `<g clip-path="url(#${id}c)"><rect class="gi-shine${fx ? ' gi-sweep' : ''}" x="-120" y="-20" width="60" height="260" fill="url(#${id}s)" transform="skewX(-22)"/></g>`;

  // Effets vivants
  if (fx && i === 5) for (let k = 0; k < 8; k++) {
    s += `<circle class="gi-ember" style="--t:${(1.6 + r() * 1.4).toFixed(2)}s;--d:${(-r() * 3).toFixed(2)}s" cx="${(50 + r() * 100).toFixed(0)}" cy="${(150 + r() * 30).toFixed(0)}" r="${(1.4 + r() * 1.6).toFixed(1)}" fill="${k % 2 ? '#ffb340' : '#ff6a2a'}"/>`;
  }
  if (fx && i === 6) ([[40, 40, 0], [160, 50, 0.6], [36, 150, 1.1], [166, 140, 0.3], [100, -10, 1.5]] as const).forEach(([x, y, d]) => {
    s += `<path class="gi-twk" style="animation-delay:${d}s" d="M${x} ${y - 8} L${x + 2} ${y - 2} L${x + 8} ${y} L${x + 2} ${y + 2} L${x} ${y + 8} L${x - 2} ${y + 2} L${x - 8} ${y} L${x - 2} ${y - 2} Z" fill="#fff6d6"/>`;
  });
  // Légende : les éclairs crépitent sur l'insigne, TOUJOURS (même en petit, dans les listes)
  if (i === 7) {
    ([[-40, 30, 30, 80, 0], [240, 40, 172, 92, 0.55], [-30, 170, 36, 130, 1.0], [235, 175, 166, 132, 0.3], [70, -40, 92, 24, 1.3], [150, -36, 112, 26, 0.8]] as const).forEach(([a, b, c, d, dl]) => {
      s += `<polyline class="gi-arc" style="animation-delay:${dl}s" points="${zigzag(r, a, b, c, d)}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>`;
    });
  }
  return s;
}

type Props = { grade: XpGrade; size?: number; locked?: boolean; animated?: boolean; className?: string; style?: CSSProperties };

/** Insigne de grade. `size` = hauteur en px (la largeur suit le cadrage du grade, plus large avec les ailes). */
export default function GradeInsignia({ grade, size = 96, locked = false, animated, className = '', style }: Props) {
  const i = Math.max(0, Math.min(7, grade.index));
  const id = 'gi' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const fx = !locked && (animated ?? size >= 40);
  const html = useMemo(() => build(i, id, fx), [i, id, fx]);
  const [x, y, w, h] = VB[i];
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      className={`gi ${i === 7 && !locked ? 'gi-legend' : ''} ${locked ? 'gi-locked' : ''} ${className}`}
      style={{ height: size, width: (size * w) / h, overflow: 'visible', flexShrink: 0, ...style }}
      role="img"
      aria-label={grade.name}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
