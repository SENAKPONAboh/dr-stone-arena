'use client';

import { useState, useEffect } from 'react';

export default function NextLifeTimer({ nextLifeAt }: { nextLifeAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const target = new Date(nextLifeAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextLifeAt]);

  if (secondsLeft <= 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 text-center">
        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">❤️ Vie en cours de régénération...</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Recharge la page</p>
      </div>
    );
  }

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const label = hours > 0
    ? `${hours}h ${minutes.toString().padStart(2, '0')}m`
    : minutes > 0
      ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
      : `${seconds}s`;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 text-center">
      <p className="text-xs font-bold text-red-500 dark:text-red-400">⏳ Prochaine vie dans</p>
      <p className="text-lg font-extrabold text-red-600 dark:text-red-300 tabular-nums">{label}</p>
    </div>
  );
}