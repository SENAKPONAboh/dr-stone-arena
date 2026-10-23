import type { CSSProperties } from 'react';

// Carte d'une « Légende Immortelle » dans un classement : des éclairs traversent la carte de haut en bas,
// avec un flash violet. Pur SVG + CSS (aucun canvas) : léger même sur 100 lignes. Le parent porte la classe `legend-row`.
const BOLTS: { pts: string; t: string; d: string }[] = [
  { pts: '62,-4 70,18 58,30 74,52 63,66 80,104', t: '2.3s', d: '0s' },
  { pts: '214,-4 204,20 222,34 206,58 226,74 212,104', t: '2.9s', d: '.9s' },
  { pts: '340,-4 352,16 334,36 356,54 342,78 360,104', t: '2.6s', d: '1.7s' },
];

// `offset` (rang dans la liste) : décale les éclairs d'une ligne à l'autre, sinon toutes les Légendes
// d'un classement s'allumaient exactement en même temps (effet mécanique).
export default function LegendRowStorm({ offset = 0 }: { offset?: number }) {
  const shift = (offset * 0.37) % 2.3;
  return (
    <svg className="legend-storm" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
      {BOLTS.map((b, i) => (
        <g key={i} style={{ '--t': b.t, '--d': `${(parseFloat(b.d) + shift).toFixed(2)}s` } as CSSProperties}>
          <rect className="ls-flash" x="0" y="0" width="400" height="100" fill="#8b5cf6" />
          <polyline className="ls-bolt" points={b.pts} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  );
}
