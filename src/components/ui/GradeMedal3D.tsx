import { useId } from 'react';
import type { XpGrade } from '@/lib/grades';

// Médaille de grade « en relief » : couches SVG empilées en 3D (épaisseur, ailes, cadre, fond, anneau, emblème, étoiles).
// Chaque couche porte une classe (gfx-rim, gfx-wingL…) et data-z : GradeUpOverlay les fait arriver une à une (assemblage).
// Grades du sommet : 5 = flamme (Maître), 6 = couronne (Grand Maître), 7 = foudre (Légende).

type Pal = { hi: string; mid: string; lo: string; deep: string };
const PAL: Record<number, Pal> = {
  5: { hi: '#fff1c2', mid: '#f97316', lo: '#7c2d12', deep: '#2e0f04' },
  6: { hi: '#fff8dc', mid: '#f2c14e', lo: '#8a5d0c', deep: '#2e2004' },
  7: { hi: '#f5f3ff', mid: '#a78bfa', lo: '#3b1590', deep: '#140632' },
};
const palOf = (g: XpGrade): Pal => PAL[g.index] ?? { hi: g.to, mid: g.from, lo: '#1e293b', deep: '#0b1110' };

const hex = (R: number, c = 100) =>
  [0, 1, 2, 3, 4, 5].map(k => { const a = (Math.PI / 180) * (60 * k - 90); return `${(c + R * Math.cos(a)).toFixed(1)},${(c + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
const star = (cx: number, cy: number, r: number) => {
  let p = '';
  for (let k = 0; k < 10; k++) { const a = (Math.PI / 5) * k - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; p += `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)} `; }
  return p;
};
const VB = '-40 -30 280 260';
const WING = 'M44 128 C14 124 -16 104 -30 70 C-14 82 0 86 12 86 C-6 76 -18 60 -24 38 C-8 56 8 64 22 66 C8 54 0 40 -2 20 C12 40 28 52 44 58 Z';
const WING_LINES = 'M12 86 C22 94 32 100 44 106 M22 66 C30 76 36 82 44 86';

function Layer({ cls, z, children }: { cls: string; z: number; children: React.ReactNode }) {
  return <svg className={`gfx-pc ${cls}`} data-z={z} viewBox={VB} style={{ transform: `translateZ(${z}px)` }} aria-hidden>{children}</svg>;
}

function Emblem({ g, k, p }: { g: XpGrade; k: string; p: Pal }) {
  if (g.index === 5) return (
    <>
      <path d="M100 56 C110 78 134 88 130 116 C127 136 114 146 100 146 C86 146 72 136 70 116 C68 98 82 90 86 74 C92 86 93 92 98 96 C103 82 97 70 100 56 Z" fill={`url(#${k}fl)`} stroke={p.deep} strokeWidth="2.5" filter={`url(#${k}gl)`} />
      <path d="M100 96 C106 108 117 114 114 128 C112 138 106 142 100 142 C93 142 86 137 86 127 C86 116 95 111 100 96 Z" fill={`url(#${k}fi)`} />
    </>
  );
  if (g.index === 6) return (
    <g filter={`url(#${k}gl)`}>
      <path d="M64 124 L58 82 L80 100 L100 66 L120 100 L142 82 L136 124 Z" fill={`url(#${k}mt)`} stroke={p.deep} strokeWidth="2.5" />
      <path d="M64 124 H136 V138 H64 Z" fill={`url(#${k}mt)`} stroke={p.deep} strokeWidth="2.5" />
      <circle cx="58" cy="82" r="5.5" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
      <circle cx="100" cy="66" r="6.5" fill="#e11d48" stroke="#fff" strokeWidth="1" />
      <circle cx="142" cy="82" r="5.5" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
      <circle cx="100" cy="131" r="4.5" fill="#e11d48" /><circle cx="80" cy="131" r="3" fill="#38bdf8" /><circle cx="120" cy="131" r="3" fill="#38bdf8" />
    </g>
  );
  if (g.index === 7) return (
    <path d="M110 54 L74 110 L97 110 L86 150 L128 90 L104 90 L120 54 Z" fill={`url(#${k}bo)`} stroke="#f5f3ff" strokeWidth="2" strokeLinejoin="round" filter={`url(#${k}gl)`} />
  );
  return <text x="100" y="113" fontSize="38" textAnchor="middle">{g.icon}</text>;
}

/** Médaille brute 240×223 px (utilisée telle quelle dans l'animation). */
export function MedalLayers({ grade: g }: { grade: XpGrade }) {
  const k = 'gm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = palOf(g);
  const nStars = g.index >= 6 ? 3 : g.index === 5 ? 1 : 0;
  return (
    <div className="gfx-med">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id={`${k}mt`} x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stopColor={p.hi} /><stop offset=".32" stopColor={p.mid} /><stop offset=".52" stopColor={p.lo} /><stop offset=".74" stopColor={p.hi} /><stop offset="1" stopColor={p.lo} /></linearGradient>
          <radialGradient id={`${k}pl`} cx=".5" cy=".38" r=".7"><stop offset="0" stopColor={p.lo} /><stop offset=".7" stopColor={p.deep} /><stop offset="1" stopColor="#000" /></radialGradient>
          <linearGradient id={`${k}fl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".45" stopColor="#ff7a1a" /><stop offset="1" stopColor="#b91c0c" /></linearGradient>
          <linearGradient id={`${k}fi`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffbe0" /><stop offset="1" stopColor="#ffb340" /></linearGradient>
          <linearGradient id={`${k}bo`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#c4b5fd" /><stop offset="1" stopColor="#7dd3fc" /></linearGradient>
          <filter id={`${k}gl`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={g.index === 7 ? 5 : 3} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
      </svg>
      {/* épaisseur du métal, visible quand la médaille tourne */}
      {[-10, -7, -4].map(z => (
        <Layer key={z} cls="gfx-thick" z={z}><polygon points={hex(84)} fill={p.deep} stroke={p.lo} strokeWidth="1" /></Layer>
      ))}
      {g.index >= 4 && (
        <>
          <Layer cls="gfx-wingL" z={-6}><path d={WING} fill={`url(#${k}mt)`} stroke={p.deep} strokeWidth="2" /><path d={WING_LINES} stroke={p.deep} strokeWidth="1.5" fill="none" opacity=".7" /></Layer>
          <Layer cls="gfx-wingR" z={-6}><g transform="translate(200,0) scale(-1,1)"><path d={WING} fill={`url(#${k}mt)`} stroke={p.deep} strokeWidth="2" /><path d={WING_LINES} stroke={p.deep} strokeWidth="1.5" fill="none" opacity=".7" /></g></Layer>
        </>
      )}
      <Layer cls="gfx-rim" z={0}>
        <polygon points={hex(84)} fill={`url(#${k}mt)`} stroke={p.hi} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points={hex(74)} fill="none" stroke={p.deep} strokeWidth="3" opacity=".8" />
      </Layer>
      <Layer cls="gfx-plate" z={5}>
        <polygon points={hex(68)} fill={`url(#${k}pl)`} stroke={p.hi} strokeOpacity=".35" strokeWidth="1" />
        <polygon points={hex(56)} fill="none" stroke={p.mid} strokeOpacity=".25" strokeWidth="1" />
      </Layer>
      <Layer cls="gfx-ring" z={11}>
        <circle cx="100" cy="100" r="45" fill="none" stroke={`url(#${k}mt)`} strokeWidth="8" />
        <circle cx="100" cy="100" r="39" fill="none" stroke={p.hi} strokeOpacity=".35" strokeWidth="1" />
        {[0, 1, 2, 3, 4, 5].map(a => { const r = (Math.PI / 3) * a - Math.PI / 2; return <circle key={a} cx={(100 + 58 * Math.cos(r)).toFixed(1)} cy={(100 + 58 * Math.sin(r)).toFixed(1)} r="3.2" fill={`url(#${k}mt)`} stroke={p.deep} strokeWidth=".8" />; })}
      </Layer>
      {nStars > 0 && (
        <Layer cls="gfx-orn" z={16}>
          <g fill={`url(#${k}mt)`} stroke={p.deep} strokeWidth="1.2">
            {nStars === 3
              ? <><polygon points={star(100, -4, 11)} /><polygon points={star(74, 6, 7)} /><polygon points={star(126, 6, 7)} /></>
              : <polygon points={star(100, -2, 10)} />}
          </g>
        </Layer>
      )}
      <Layer cls="gfx-emb" z={24}><Emblem g={g} k={k} p={p} /></Layer>
      <div className="gfx-shine" data-z={26} style={{ transform: 'translateZ(26px)' }} />
    </div>
  );
}

/** Médaille à une taille donnée (largeur en px). */
export default function GradeMedal3D({ grade, width = 120, className = '' }: { grade: XpGrade; width?: number; className?: string }) {
  const s = width / 240;
  return (
    <div className={`gfx-mini ${className}`} style={{ width, height: 223 * s, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <MedalLayers grade={grade} />
      </div>
    </div>
  );
}
