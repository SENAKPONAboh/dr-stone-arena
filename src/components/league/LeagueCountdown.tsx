'use client';

import { useEffect, useState } from 'react';

// Compte à rebours jusqu'à la fin de la semaine de ligue (dimanche 23:59 à Niamey).
export default function LeagueCountdown({ endsAt, className = '' }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  const label = ms === 0 ? 'Semaine terminée' : d > 0 ? `${d} j ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
  return <span className={className} suppressHydrationWarning>{label}</span>;
}
