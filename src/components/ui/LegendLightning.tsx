'use client';

import { useEffect, useRef } from 'react';
import { createFx } from '@/lib/grade-fx';

// Profil d'une « Légende Immortelle » : de vrais éclairs traversent l'écran de haut en bas (souvent en diagonale),
// par-dessus le profil, toutes les quelques secondes. Sans son, sans bloquer les clics.
export default function LegendLightning() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !cvRef.current) return;
    const fx = createFx(cvRef.current, {
      maxParts: 0,
      onStrike: () => {
        const f = flashRef.current; if (!f) return;
        f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      },
    });
    Object.assign(fx.st, { mode: 'storm', auto: true, autoMin: 2600, autoMax: 5600, next: performance.now() + 700 });
    return () => fx.destroy();
  }, []);

  return (
    <>
      <canvas ref={cvRef} className="pointer-events-none fixed inset-0 z-20 h-full w-full" aria-hidden />
      <div ref={flashRef} className="gfx-flash pointer-events-none fixed inset-0 z-20 opacity-0"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(196,181,253,.55), rgba(139,92,246,.25) 50%, transparent 80%)', '--fo': '.7', '--fd': '.4s' } as React.CSSProperties} />
    </>
  );
}
