'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { getFrameDef } from '@/lib/personnalisation-data';

type GoldAvatarProps = {
  imageUrl?: string | null;
  initials: string;
  passActive?: boolean;
  frameKey?: string | null; // 🖼️ Cadre équipé — REMPLACE l'Anneau d'Or
  size?: number;
};

const GOLD_GRADIENT = 'conic-gradient(from 0deg, #b45309, #f59e0b, #fde68a, #ffffff, #fde68a, #f59e0b, #b45309)';
const GOLD_GLOW: [string, string, string] = ['0 0 6px rgba(251,191,36,0.45)', '0 0 16px rgba(251,191,36,0.85)', '0 0 6px rgba(251,191,36,0.45)'];
const GOLD_PARTICLE = '#fbbf24';

export default function GoldAvatar({ imageUrl, initials, passActive = false, frameKey, size = 32 }: GoldAvatarProps) {
  const reduceMotion = useReducedMotion();
  const frame = frameKey ? getFrameDef(frameKey) : null;

  if (!frame && !passActive) {
    if (imageUrl) {
      return <img src={imageUrl} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />;
    }
    return (
      <div style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} className="rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
        {initials}
      </div>
    );
  }

  const gradient = frame ? frame.gradient : GOLD_GRADIENT;
  const glow = frame ? frame.glow : GOLD_GLOW;
  const duration = frame ? frame.duration : 3.5;
  const particleColor = frame ? frame.particleColor : GOLD_PARTICLE;
  const effect = frame ? frame.effect : 'orbit'; // l'Anneau d'Or gagne des étincelles en orbite
  const ring = Math.max(2, Math.round(size * 0.08));
  const orbitRadius = size / 2 + ring;

  return (
    <motion.div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{ width: size + ring * 2, height: size + ring * 2 }}
      animate={reduceMotion ? undefined : { boxShadow: [glow[0], glow[1], glow[2]] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.08 }}
    >
      {/* Anneau conique rotatif */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />

      {/* ===== 🔥 FEU : 8 flammes qui lèchent autour + braises qui montent ===== */}
      {frame && !reduceMotion && effect === 'fire' && (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <div key={`flame-${angle}`}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                width: Math.max(5, size * 0.18), height: Math.max(9, size * 0.34),
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${orbitRadius}px)`,
              }}>
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%',
                background: 'radial-gradient(ellipse at 50% 100%, #fef3c7, #fbbf24 35%, #ea580c 70%, transparent 95%)',
                filter: 'blur(1px)',
                animation: `flameFlicker ${0.8 + (angle % 7) * 0.15}s ease-in-out infinite`,
              }} />
            </div>
          ))}
          {[0, 1, 2, 3, 4].map(i => (
            <span key={`ember-${i}`}
              style={{
                position: 'absolute', borderRadius: '50%',
                width: 3, height: 3, background: '#fdba74', filter: 'blur(0.5px)',
                top: '22%', left: `${14 + i * 18}%`,
                animation: `emberRise ${1.2 + i * 0.25}s ease-out ${i * 0.3}s infinite`,
              }} />
          ))}
        </>
      )}

      {/* ===== 🌌 GALAXIE : étoiles en double orbite contrarotative ===== */}
      {frame && !reduceMotion && effect === 'galaxy' && (
        <>
          <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}>
            {[0, 120, 240].map(a => (
              <span key={a} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: Math.max(2, size * 0.07), height: Math.max(2, size * 0.07),
                borderRadius: '50%', background: '#ffffff',
                boxShadow: `0 0 6px ${particleColor}`,
                transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${orbitRadius + 2}px)`,
                animation: 'starTwinkle 1.6s ease-in-out infinite',
              }} />
            ))}
          </motion.div>
          <motion.div className="absolute inset-0" animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}>
            {[60, 240].map(a => (
              <span key={a} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: Math.max(1.5, size * 0.05), height: Math.max(1.5, size * 0.05),
                borderRadius: '50%', background: particleColor,
                boxShadow: `0 0 5px ${particleColor}`,
                transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${orbitRadius - 1}px)`,
                animation: 'starTwinkle 2.2s ease-in-out infinite',
              }} />
            ))}
          </motion.div>
        </>
      )}

      {/* ===== ⚡ NÉON : enseigne qui grésille ===== */}
      {frame && !reduceMotion && effect === 'neon' && (
        <div className="absolute -inset-1 rounded-full" style={{
          border: `2px solid ${particleColor}`,
          boxShadow: `0 0 12px ${particleColor}, inset 0 0 8px ${particleColor}`,
          animation: 'neonFlicker 2.4s linear infinite',
        }} />
      )}

      {/* ===== 🌈 ARC-EN-CIEL : rotation de teintes ===== */}
      {frame && !reduceMotion && effect === 'rainbow' && (
        <div className="absolute -inset-1 rounded-full" style={{
          boxShadow: '0 0 14px rgba(255,255,255,0.65)',
          animation: 'hueShift 3s linear infinite',
        }} />
      )}

      {/* ===== ❄️ GLACE : éclats scintillants ===== */}
      {frame && !reduceMotion && effect === 'ice' && (
        <>
          {[0, 72, 144, 216, 288].map(a => (
            <span key={a} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: Math.max(3, size * 0.09), height: Math.max(3, size * 0.09),
              background: '#ffffff', borderRadius: '2px',
              transform: `translate(-50%, -50%) rotate(${a + 45}deg) translateY(-${orbitRadius}px)`,
              boxShadow: '0 0 6px #bae6fd',
              animation: `starTwinkle ${1.4 + (a % 3) * 0.5}s ease-in-out infinite`,
            }} />
          ))}
        </>
      )}

      {/* ===== 🟡 ORBITE : particules en orbite (cadres communs + Anneau d'Or) ===== */}
      {!reduceMotion && effect === 'orbit' && (
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}>
          {[0, 140, 260].map(a => (
            <span key={a} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: Math.max(2.5, size * 0.09), height: Math.max(2.5, size * 0.09),
              borderRadius: '50%', background: particleColor,
              boxShadow: `0 0 6px ${particleColor}`,
              transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${orbitRadius + 1}px)`,
            }} />
          ))}
        </motion.div>
      )}

      {/* Photo / initiales */}
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: size, height: size }} className="relative rounded-full object-cover border-2 border-[#0f0a05]" />
      ) : (
        <div
          style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
          className="relative rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-[#1a1308] flex items-center justify-center font-extrabold border-2 border-[#0f0a05]"
        >
          {initials}
        </div>
      )}
    </motion.div>
  );
}