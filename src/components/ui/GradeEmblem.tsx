'use client';

import { useReducedMotion } from 'framer-motion';
import type { XpGrade } from '@/lib/grades';

// Médaillon d'un grade : halo qui respire, anneau qui tourne (dès « Chirurgien »).
// Grand Maître : braises qui montent. Légende Immortelle : tempête — foudre qui claque autour, anneau électrique, éclairs.
export default function GradeEmblem({ grade, size = 96, locked = false }: { grade: XpGrade; size?: number; locked?: boolean }) {
  const reduce = useReducedMotion();
  const storm = grade.index === 7;
  const spin = !reduce && grade.index >= 4 && !locked;
  const ring = Math.max(3, Math.round(size * 0.07));
  const orbit = size * 0.6;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, opacity: locked ? 0.4 : 1, filter: locked ? 'grayscale(1)' : undefined }}>
      {!locked && (
        <span className="absolute rounded-full blur-xl" style={{ inset: -size * 0.12, background: grade.glow, opacity: storm ? 0.75 : 0.55, animation: reduce ? undefined : storm ? 'fxStorm 3s linear infinite' : 'logo-pulse 3s ease-in-out infinite' }} />
      )}
      <span className="absolute inset-0 rounded-full"
        style={{
          background: storm
            ? 'conic-gradient(from 0deg, #1e1b4b, #8b5cf6, #ffffff, #8b5cf6, #1e1b4b, #4c1d95, #ffffff, #4c1d95, #1e1b4b)'
            : `conic-gradient(from 0deg, ${grade.from}, ${grade.to}, ${grade.from}, ${grade.to}, ${grade.from})`,
          animation: spin ? `fxAuroraSpin ${storm ? 2.2 : 7}s linear infinite` : undefined,
          boxShadow: locked ? undefined : `0 0 ${10 + grade.index * 4}px ${grade.glow}`,
        }} />
      <span className="relative flex items-center justify-center rounded-full"
        style={{ width: size - ring * 2, height: size - ring * 2, background: storm ? 'radial-gradient(circle at 35% 30%, #1b1640, #05030f 78%)' : 'radial-gradient(circle at 35% 30%, #1f2b27, #0d1311 75%)', fontSize: size * 0.44 }}>
        <span style={{ filter: locked ? undefined : `drop-shadow(0 0 ${size * 0.1}px ${storm ? '#c4b5fd' : grade.glow})`, animation: !reduce && grade.index >= 6 && !locked ? (storm ? 'neonFlicker 2.4s linear infinite' : 'heartbeat 2.4s ease-in-out infinite') : undefined }}>{grade.icon}</span>
      </span>

      {/* Grand Maître : braises */}
      {!reduce && !locked && grade.index === 6 && [0, 1, 2, 3, 4].map(i => (
        <span key={i} style={{
          position: 'absolute', width: Math.max(2, size * 0.05), height: Math.max(2, size * 0.05), borderRadius: '50%', background: '#fdba74',
          top: '30%', left: `${18 + i * 16}%`, animation: `emberRise ${1.3 + i * 0.25}s ease-out ${i * 0.3}s infinite`,
        }} />
      ))}

      {/* Légende Immortelle : éclairs qui claquent tout autour */}
      {!reduce && !locked && storm && [0, 90, 180, 270].map((a, i) => (
        <svg key={a} viewBox="0 0 12 18" style={{
          position: 'absolute', top: '50%', left: '50%', width: Math.max(8, size * 0.2), height: Math.max(12, size * 0.3),
          transform: `translate(-50%, -50%) rotate(${a + 25}deg) translateY(-${orbit}px)`,
          filter: 'drop-shadow(0 0 5px #c4b5fd)', animation: `fxBolt ${2.2 + i * 0.35}s linear ${i * 0.45}s infinite`, opacity: 0,
        }}>
          <polygon points="7,0 0,10 5,10 3,18 12,6 7,6" fill="#ffffff" stroke="#c4b5fd" strokeWidth="0.6" />
        </svg>
      ))}
    </div>
  );
}
