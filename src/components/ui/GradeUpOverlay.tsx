'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { XpGrade } from '@/lib/grades';
import GradeEmblem from './GradeEmblem';

// Plein écran « NOUVEAU GRADE » : médaille qui tourne, rayons de lumière, confettis aux couleurs du grade.
export default function GradeUpOverlay({ from, to, onClose }: { from: XpGrade; to: XpGrade; onClose: () => void }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    // Légende Immortelle : couleurs « tempête » (violet électrique, blanc, jaune foudre, rouge)
    const colors = to.index === 7 ? ['#8b5cf6', '#dbeafe', '#ffffff', '#fde047', '#ef4444'] : [to.from, to.to, '#ffffff', '#fde047'];
    const power = 60 + to.index * 22;
    confetti({ particleCount: power, spread: 90, startVelocity: 45, origin: { y: 0.5 }, colors });
    const timers = [
      setTimeout(() => confetti({ particleCount: power / 2, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 350),
      setTimeout(() => confetti({ particleCount: power / 2, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 350),
    ];
    return () => timers.forEach(clearTimeout);
  }, [to, reduce]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#070b0a]/95 p-6 text-center"
      role="dialog" aria-label="Nouveau grade"
    >
      <div className="fx-rays" style={{ opacity: 0.5, background: `repeating-conic-gradient(from 0deg, ${to.from}88 0deg 6deg, transparent 6deg 24deg)` }} />

      {/* Grades les plus hauts : le tonnerre gronde — éclats de lumière et éclairs qui frappent l'écran */}
      {to.index >= 6 && !reduce && (
        <>
          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 28%, #ffffff, rgba(139,92,246,0.55) 42%, transparent 75%)', opacity: 0, animation: 'fxLightning 2.4s linear -1.9s infinite' }} />
          {[8, 78, 22, 88].map((left, i) => (
            <svg key={i} viewBox="0 0 12 18" className="pointer-events-none absolute"
              style={{ left: `${left}%`, top: `${6 + (i % 2) * 38}%`, width: 46 + i * 8, height: 70 + i * 12, opacity: 0, filter: 'drop-shadow(0 0 12px #c4b5fd)', animation: `fxBolt ${2.1 + i * 0.3}s linear ${i * 0.5}s infinite`, transform: `rotate(${i % 2 ? 14 : -14}deg)` }}>
              <polygon points="7,0 0,10 5,10 3,18 12,6 7,6" fill="#ffffff" stroke="#a78bfa" strokeWidth="0.5" />
            </svg>
          ))}
        </>
      )}

      <motion.div
        className="relative w-full max-w-sm"
        animate={to.index >= 6 && !reduce ? { x: [0, -10, 9, -7, 5, -3, 0] } : undefined}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="mb-6 font-display text-xs font-extrabold uppercase tracking-[0.35em] text-white/70">Nouveau grade</motion.p>

        <motion.div
          initial={{ scale: 0.1, rotateY: -540, opacity: 0 }}
          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
          className="mb-8 flex justify-center"
        >
          <GradeEmblem grade={to} size={170} />
        </motion.div>

        <motion.h2
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.55 }}
          className="font-display text-3xl font-black leading-tight"
          style={{ background: `linear-gradient(90deg, ${to.from}, ${to.to}, ${to.from})`, backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', textShadow: `0 0 30px ${to.glow}`, animation: reduce ? undefined : 'fxTextFlow 2.5s linear infinite' }}
        >
          {to.name}
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-3 text-sm text-white/70">{to.tagline}</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-2 text-xs text-white/40">
          {from.icon} {from.name} <span className="mx-1">→</span> {to.icon} {to.name}
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-white py-4 font-display text-sm font-extrabold uppercase tracking-wide text-[#0d1311] shadow-[0_5px_0_rgba(255,255,255,0.35)] transition-transform active:translate-y-1"
        >
          Continuer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
