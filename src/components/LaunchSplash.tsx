'use client';

import { useEffect, useRef } from 'react';
import LogoHero from '@/components/ui/LogoHero';

// Écran d'ouverture animé : une fois par ouverture de l'application (par session).
// Le petit script placé dans <body> décide AVANT l'affichage (html[data-splash="1"]), donc pas de clignotement.
export default function LaunchSplash() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.splash !== '1') return;
    try { sessionStorage.setItem('arena-splash', '1'); } catch { /* navigation privée */ }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const out = setTimeout(() => ref.current?.classList.add('is-out'), reduce ? 900 : 3000);
    const end = setTimeout(() => { delete html.dataset.splash; }, reduce ? 1400 : 3500);
    return () => { clearTimeout(out); clearTimeout(end); };
  }, []);

  const skip = () => {
    ref.current?.classList.add('is-out');
    setTimeout(() => { delete document.documentElement.dataset.splash; }, 450);
  };

  return (
    <div ref={ref} className="launch-splash" onClick={skip} aria-hidden>
      <LogoHero />
    </div>
  );
}
