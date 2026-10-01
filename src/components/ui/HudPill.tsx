'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import Icon, { type IconName } from './Icon';

type Kind = 'flame' | 'xp' | 'lives' | 'elite';

const CONFIG: Record<Kind, { icon: IconName; color: string; anim: string }> = {
  flame: { icon: 'flame', color: 'text-flame', anim: 'animate-flame-flicker' },
  xp: { icon: 'star', color: 'text-mala', anim: '' },
  lives: { icon: 'heart', color: 'text-heart', anim: 'animate-heartbeat' },
  elite: { icon: 'shield', color: 'text-gold', anim: '' },
};

type Props = { kind: Kind; value: number; className?: string };

// Pastille du HUD : le chiffre défile jusqu'à la nouvelle valeur et la pastille pulse.
export default function HudPill({ kind, value, className = '' }: Props) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [pulse, setPulse] = useState(0);
  const prev = useRef(value);
  const cfg = CONFIG[kind];
  // Le cœur bat plus vite quand il reste 1 ou 2 vies.
  const iconAnim = kind === 'lives' && value > 0 && value <= 2 ? 'animate-heartbeat-fast' : cfg.anim;

  useEffect(() => {
    if (prev.current === value) return;
    const from = prev.current;
    prev.current = value;
    setPulse((p) => p + 1);
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(from, value, { duration: 0.8, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <div
      key={pulse}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-slab px-3 py-1.5 font-display text-sm font-bold tabular-nums text-ink ${pulse ? 'animate-pop-in' : ''} ${className}`}
      style={pulse ? { animationDuration: '0.4s' } : undefined}
    >
      <span className={`inline-flex ${cfg.color} ${iconAnim}`}>
        <Icon name={cfg.icon} size={18} />
      </span>
      {shown}
    </div>
  );
}
