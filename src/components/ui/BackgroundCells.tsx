// Cellules / globules très discrets qui dérivent lentement (8 cercles flous).
const CELLS = [
  { l: '8%', t: '12%', s: 120, d: 0 },
  { l: '78%', t: '8%', s: 90, d: 3 },
  { l: '60%', t: '38%', s: 150, d: 6 },
  { l: '15%', t: '55%', s: 100, d: 2 },
  { l: '85%', t: '65%', s: 130, d: 8 },
  { l: '40%', t: '80%', s: 110, d: 5 },
  { l: '5%', t: '88%', s: 80, d: 9 },
  { l: '50%', t: '5%', s: 70, d: 4 },
];

export default function BackgroundCells({ gold = false }: { gold?: boolean }) {
  const color = gold ? 'rgba(242,193,78,0.07)' : 'rgba(47,210,138,0.07)';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CELLS.map((c, i) => (
        <span
          key={i}
          className="absolute rounded-full blur-2xl animate-cell-drift"
          style={{ left: c.l, top: c.t, width: c.s, height: c.s, background: color, animationDelay: `-${c.d}s` }}
        />
      ))}
    </div>
  );
}
