'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// « Ta Flamme grandit » : plein écran court quand la Flamme passe de N à N+1.
// Seulement transform / opacity, ≤ 16 étincelles, mouvement réduit = simple fondu sans boucle.
// FlameUpWatcher décide quand la montrer : une seule fois par jour et par appareil (localStorage).

const WAT_OFFSET_MS = 60 * 60 * 1000;
const todayIndex = () => Math.floor((Date.now() + WAT_OFFSET_MS) / 86400000);

type Stored = { v: number; shown?: number };

export function FlameUpWatcher({ streak, storageKey }: { streak: number; storageKey: string }) {
  const [show, setShow] = useState<number | null>(null);
  const close = useCallback(() => setShow(null), []);

  useEffect(() => {
    const key = `arena-flame:${storageKey}`;
    try {
      const raw = localStorage.getItem(key);
      const stored: Stored | null = raw ? JSON.parse(raw) : null;
      const today = todayIndex();
      let shown = stored?.shown;
      // Première visite sur cet appareil : on mémorise sans rien montrer
      if (stored && streak >= 1 && streak > stored.v && stored.shown !== today) {
        setShow(streak);
        shown = today;
      }
      localStorage.setItem(key, JSON.stringify({ v: streak, shown }));
    } catch {
      // Stockage bloqué (navigation privée) : pas d'animation, rien ne casse
    }
  }, [streak, storageKey]);

  return (
    <AnimatePresence>
      {show !== null && <FlameUpOverlay key="flame-up" to={show} onClose={close} />}
    </AnimatePresence>
  );
}

function headline(to: number) {
  if (to === 1) return 'Flamme allumée !';
  if (to % 30 === 0) return 'Un mois de garde !';
  if (to % 7 === 0) return 'Une semaine de garde !';
  return 'Ta Flamme grandit !';
}

export default function FlameUpOverlay({ to, onClose }: { to: number; onClose: () => void }) {
  const reduce = useReducedMotion();
  const from = Math.max(0, to - 1);
  const [rolled, setRolled] = useState(!!reduce);
  const big = to >= 7;

  const sparks = useMemo(() => Array.from({ length: big ? 16 : 12 }, (_, i) => {
    const a = (i / (big ? 16 : 12)) * Math.PI * 2 + Math.random() * 0.4;
    const r = 90 + Math.random() * 70;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8 - 40, d: 0.5 + Math.random() * 0.35, s: 4 + Math.random() * 5, k: i % 3 };
  }), [big]);

  useEffect(() => {
    const t1 = reduce ? null : setTimeout(() => setRolled(true), 750);
    const t2 = setTimeout(onClose, reduce ? 2600 : 3800);
    return () => { if (t1) clearTimeout(t1); clearTimeout(t2); };
  }, [reduce, onClose]);

  const sparkColor = ['#ffd36b', '#ff8a3d', '#fff3c4'];

  return (
    <motion.div
      role="dialog" aria-live="polite" aria-label={`Flamme : ${to} jour${to > 1 ? 's' : ''}`}
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center overflow-hidden bg-stone/85 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}
      onClick={onClose}
    >
      {/* Halo chaud qui respire derrière la flamme */}
      <motion.div aria-hidden className="pointer-events-none absolute h-[420px] w-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,138,61,0.45) 0%, rgba(255,138,61,0.12) 45%, transparent 70%)' }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0.3, 1.15, 1], opacity: [0, 1, 0.85] }}
        transition={{ duration: 1, ease: 'easeOut' }} />

      <div className="relative flex h-56 w-56 items-center justify-center">
        {/* Onde de choc quand la flamme s'embrase */}
        {!reduce && (
          <motion.div aria-hidden className="absolute h-40 w-40 rounded-full border-4 border-flame"
            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 2.2], opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }} />
        )}

        {/* Étincelles */}
        {!reduce && sparks.map((p, i) => (
          <motion.span key={i} aria-hidden className="absolute rounded-full"
            style={{ width: p.s, height: p.s, background: sparkColor[p.k], boxShadow: `0 0 8px ${sparkColor[p.k]}` }}
            initial={{ x: 0, y: 20, opacity: 0, scale: 0.4 }}
            animate={{ x: p.x, y: [20, p.y, p.y - 60], opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 1.4, delay: p.d, ease: 'easeOut' }} />
        ))}

        {/* La flamme : petite braise qui grandit, puis vacille */}
        <motion.div className="relative"
          initial={{ scale: 0.35, y: 30, opacity: 0 }}
          animate={reduce ? { scale: 1, y: 0, opacity: 1 } : { scale: [0.35, 0.55, 1.18, 1], y: [30, 20, -6, 0], opacity: [0, 1, 1, 1] }}
          transition={{ duration: 1.1, times: [0, 0.35, 0.75, 1], ease: 'easeOut' }}
        >
          <div className={reduce ? '' : 'animate-flame-flicker'} style={{ transformOrigin: '50% 90%' }}>
            <svg width="150" height="170" viewBox="0 0 24 27" aria-hidden>
              <defs>
                <linearGradient id="fu-outer" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ff5a1f" />
                  <stop offset="55%" stopColor="#ff8a3d" />
                  <stop offset="100%" stopColor="#ffc24d" />
                </linearGradient>
                <linearGradient id="fu-inner" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ffd36b" />
                  <stop offset="100%" stopColor="#fff6d6" />
                </linearGradient>
              </defs>
              <path d="M12 1c.7 3.6-1.3 5.5-3.1 7.4C7 10.4 5.3 12.5 5.3 15.6a6.7 6.7 0 0 0 13.4 0c0-2.7-1.1-4.7-2.5-6.3-.3 1.2-1 2.1-2 2.6.6-3.8-.3-8.3-2.2-10.9Z" fill="url(#fu-outer)" />
              <path d="M12.3 11.5c.3 1.8-.7 2.8-1.5 3.8-.8.9-1.4 1.8-1.4 3a2.9 2.9 0 0 0 5.8 0c0-1.5-.7-2.6-1.4-3.4-.1.6-.4 1-.9 1.2.2-1.7-.1-3.5-.6-4.6Z" fill="url(#fu-inner)" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Compteur : N s'envole, N+1 arrive par le bas */}
      <div className="relative -mt-4 h-20 overflow-hidden text-center font-display text-7xl font-extrabold tabular-nums text-flame"
        style={{ textShadow: '0 0 24px rgba(255,138,61,0.55)' }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={rolled ? to : from} className="block"
            initial={{ y: 70, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: rolled && !reduce ? [1.25, 1] : 1 }}
            exit={{ y: -70, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
            {rolled ? to : from}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.p className="mt-1 font-display text-xl font-extrabold text-ink"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.95 }}>
        {headline(to)}
      </motion.p>
      <motion.p className="mt-1 text-sm text-mute"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 1.1 }}>
        {to} jour{to > 1 ? 's' : ''} de garde d&apos;affilée. Reviens demain pour la faire grandir.
      </motion.p>

      <motion.button type="button" onClick={onClose}
        className="mt-6 rounded-full border border-line bg-slab px-6 py-2.5 font-display text-sm font-bold text-ink active:scale-95"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.3 }}>
        Continuer
      </motion.button>
    </motion.div>
  );
}
