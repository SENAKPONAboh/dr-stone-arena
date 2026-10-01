'use client';

type Props = { remaining: number; total: number; size?: number };

// Chrono circulaire : vert, puis orange, puis rouge ; bat dans les 10 dernières secondes.
export default function TimerRing({ remaining, total, size = 56 }: Props) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, total > 0 ? remaining / total : 0));
  const color = ratio > 0.5 ? '#2fd28a' : ratio > 0.25 ? '#ff8a3d' : '#ff5470';
  const urgent = remaining <= 10 && remaining > 0;
  return (
    <div className={`relative inline-flex items-center justify-center ${urgent ? 'animate-heartbeat-fast' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2723" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="absolute font-display text-sm font-bold tabular-nums text-ink">{Math.max(0, Math.ceil(remaining))}</span>
    </div>
  );
}
