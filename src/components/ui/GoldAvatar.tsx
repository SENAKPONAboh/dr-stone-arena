'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { getFrameDef } from '@/lib/personnalisation-data';

type GoldAvatarProps = {
  imageUrl?: string | null;
  initials: string;
  passActive?: boolean;
  frameKey?: string | null; // 🖼️ Cadre équipé — REMPLACE l'Anneau d'Or (règle validée)
  size?: number;
};

const GOLD_GRADIENT = 'conic-gradient(from 0deg, #b45309, #f59e0b, #fde68a, #ffffff, #fde68a, #f59e0b, #b45309)';
const GOLD_GLOW: [string, string, string] = ['0 0 6px rgba(251,191,36,0.45)', '0 0 16px rgba(251,191,36,0.85)', '0 0 6px rgba(251,191,36,0.45)'];

export default function GoldAvatar({ imageUrl, initials, passActive = false, frameKey, size = 32 }: GoldAvatarProps) {
  const reduceMotion = useReducedMotion();
  const frame = frameKey ? getFrameDef(frameKey) : null;

  // Priorité : CADRE équipé > Anneau d'Or (Pass) > avatar simple
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
  const ring = Math.max(2, Math.round(size * 0.08));

  return (
    <motion.div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{ width: size + ring * 2, height: size + ring * 2 }}
      animate={reduceMotion ? undefined : { boxShadow: [glow[0], glow[1], glow[2]] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.08 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />
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