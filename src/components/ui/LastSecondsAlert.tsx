'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// ⏱️ Compte à rebours des 10 dernières secondes : grand chiffre qui clignote au centre de l'écran,
// bordure rouge qui pulse, bip à chaque seconde (de plus en plus aigu) et petite vibration sur téléphone.
// Un bouton permet de couper le son (mémorisé sur l'appareil). Ne bloque jamais les clics : on peut répondre pendant ce temps.

const SOUND_KEY = 'arena-sound';

export default function LastSecondsAlert({ remaining, active }: { remaining: number; active: boolean }) {
  const reduce = useReducedMotion();
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const show = active && remaining > 0 && remaining <= 10;

  // Préférence de son
  useEffect(() => {
    try { setMuted(localStorage.getItem(SOUND_KEY) === 'off'); } catch { /* stockage indisponible */ }
  }, []);

  // Les navigateurs n'autorisent le son qu'après un geste : on prépare l'audio dès le premier toucher
  useEffect(() => {
    const unlock = () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        if (!ctxRef.current) ctxRef.current = new AC();
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      } catch { /* pas de son possible */ }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    unlock();
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Un bip par seconde, plus aigu à l'approche de la fin
  useEffect(() => {
    if (!show) return;
    try { if ('vibrate' in navigator) navigator.vibrate(remaining <= 3 ? 120 : 50); } catch { /* ignoré */ }
    if (muted) return;
    try {
      const ctx = ctxRef.current;
      if (!ctx || ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = remaining <= 3 ? 'square' : 'sine';
      osc.frequency.value = remaining <= 3 ? 1040 : remaining <= 6 ? 820 : 640;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(remaining <= 3 ? 0.28 : 0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (remaining <= 3 ? 0.22 : 0.14));
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch { /* ignoré */ }
  }, [remaining, show, muted]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(SOUND_KEY, next ? 'off' : 'on'); } catch { /* ignoré */ }
  };

  if (!show) return null;
  const urgent = remaining <= 3;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-live="assertive">
      {/* Bordure rouge qui pulse */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(239,68,68,0.55) 100%)',
        animation: reduce ? undefined : `fxVignette ${urgent ? 0.5 : 1}s ease-in-out infinite`,
        opacity: reduce ? 0.5 : undefined,
      }} />

      {/* Gros chiffre (key = relance l'animation à chaque seconde) */}
      <span key={remaining}
        className="relative select-none font-display font-black leading-none"
        style={{
          fontSize: remaining >= 10 ? 'min(40vw, 40vh)' : 'min(58vw, 46vh)',
          color: urgent ? '#ff2d4d' : '#ff7a59',
          opacity: 0.88,
          textShadow: '0 0 40px rgba(239,68,68,0.9), 0 0 6px rgba(0,0,0,0.6)',
          WebkitTextStroke: '2px rgba(255,255,255,0.35)',
          animation: reduce ? undefined : `fxCount ${urgent ? 0.5 : 0.9}s ease-out both`,
        }}>
        {remaining}
      </span>

      {/* Coupure du son */}
      <button type="button" onClick={toggleSound}
        className="pointer-events-auto absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-xl text-white backdrop-blur"
        aria-label={muted ? 'Activer le son du compte à rebours' : 'Couper le son du compte à rebours'}>
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
