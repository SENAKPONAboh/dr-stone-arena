'use client';

import { useEffect, useState } from 'react';

// Compte à rebours jusqu'à une date (ouverture ou clôture d'un tournoi).
export default function Countdown({ to, prefix = '', className = '' }: { to: string; prefix?: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className={className}>…</span>;

  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={className}>maintenant</span>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const text = d > 0 ? `${d} j ${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return <span className={`tabular-nums ${className}`}>{prefix}{text}</span>;
}
