'use client';

import { useReducedMotion } from 'framer-motion';
import type { XpGrade } from '@/lib/grades';

// Médaillon d'un grade : halo qui respire, anneau qui tourne (dès « Chirurgien »), étincelles pour les grades les plus hauts.
export default function GradeEmblem({ grade, size = 96, locked = false }: { grade: XpGrade; size?: number; locked?: boolean }) {
  const reduce = useReducedMotion();
  const spin = !reduce && grade.index >= 4 && !locked;
  const ring = Math.max(3, Math.round(size * 0.07));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, opacity: locked ? 0.4 : 1, filter: locked ? 'grayscale(1)' : undefined }}>
      {!locked && (
        <span className="absolute rounded-full blur-xl" style={{ inset: -size * 0.12, background: grade.glow, opacity: 0.55, animation: reduce ? undefined : 'logo-pulse 3s ease-in-out infinite' }} />
      )}
      <span className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${grade.from}, ${grade.to}, ${grade.from}, ${grade.to}, ${grade.from})`,
          animation: spin ? `fxAuroraSpin ${grade.index >= 7 ? 3 : 7}s linear infinite` : undefined,
          boxShadow: locked ? undefined : `0 0 ${10 + grade.index * 4}px ${grade.glow}`,
        }} />
      <span className="relative flex items-center justify-center rounded-full"
        style={{ width: size - ring * 2, height: size - ring * 2, background: 'radial-gradient(circle at 35% 30%, #1f2b27, #0d1311 75%)', fontSize: size * 0.44 }}>
        <span style={{ filter: locked ? undefined : `drop-shadow(0 0 ${size * 0.08}px ${grade.glow})`, animation: !reduce && grade.index >= 6 && !locked ? 'heartbeat 2.4s ease-in-out infinite' : undefined }}>{grade.icon}</span>
      </span>
      {!reduce && !locked && grade.index >= 6 && [0, 120, 240].map((a, i) => (
        <span key={a} style={{
          position: 'absolute', top: '50%', left: '50%', fontSize: Math.max(8, size * 0.14), color: '#fff', lineHeight: 1,
          transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${size * 0.58}px)`,
          animation: `fxSpark ${1.8 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
        }}>✦</span>
      ))}
    </div>
  );
}
