'use client';

import { motion, useReducedMotion } from 'framer-motion';

type GoldAvatarProps = {
  imageUrl?: string | null;
  initials: string;
  passActive?: boolean;
  size?: number;
};

// Avatar avec anneau or rotatif + halo pulsé — réservé aux comptes Pass Monétisé ACTIF.
// (L'éclair est volontairement absent : réservé à un usage futur.)
export default function GoldAvatar({ imageUrl, initials, passActive = false, size = 32 }: GoldAvatarProps) {
  const reduceMotion = useReducedMotion();

  // --- Avatar standard (sans Pass) : rendu identique à l'existant ---
  if (!passActive) {
    if (imageUrl) {
      return <img src={imageUrl} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />;
    }
    return (
      <div style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} className="rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
        {initials}
      </div>
    );
  }

  // --- Avatar PASS : anneau or rotatif + halo doré pulsé ---
  const ring = Math.max(2, Math.round(size * 0.08));

  return (
    <motion.div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{ width: size + ring * 2, height: size + ring * 2 }}
      animate={reduceMotion ? undefined : { boxShadow: ['0 0 6px rgba(251,191,36,0.45)', '0 0 16px rgba(251,191,36,0.85)', '0 0 6px rgba(251,191,36,0.45)'] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.08 }}
    >
      {/* Anneau or qui tourne (dégradé conique doré) */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'conic-gradient(from 0deg, #b45309, #f59e0b, #fde68a, #ffffff, #fde68a, #f59e0b, #b45309)' }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
      />
      {/* Photo ou initiales, par-dessus l'anneau */}
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