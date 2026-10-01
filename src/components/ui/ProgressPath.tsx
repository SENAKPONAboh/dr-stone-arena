'use client';

import { motion } from 'framer-motion';
import Icon from './Icon';

type Props = {
  total?: number; // nombre de cas (10 par défaut)
  done: number; // cas terminés
  className?: string;
};

const OFFSETS = [0, 36, 56, 36, 0, -36, -56, -36];

// Parcours du jour façon Duolingo : nœuds en zigzag, le dernier nœud est le coffre.
export default function ProgressPath({ total = 10, done, className = '' }: Props) {
  const nodes = Array.from({ length: total + 1 }, (_, i) => i);
  const nearChest = done >= total - 2 && done < total;

  return (
    <div className={`relative mx-auto flex w-full max-w-xs flex-col items-center gap-3 py-2 ${className}`}>
      {nodes.map((i) => {
        const isChest = i === total;
        const state = isChest ? (done >= total ? 'done' : 'todo') : i < done ? 'done' : i === done ? 'current' : 'todo';
        const base = 'flex h-14 w-14 items-center justify-center rounded-full border-b-4 font-display text-base font-extrabold';
        const look =
          state === 'done'
            ? 'border-mala-deep bg-mala text-stone shadow-[0_0_14px_rgba(47,210,138,0.45)]'
            : state === 'current'
              ? 'border-mala-deep bg-mala text-stone animate-node-breathe'
              : 'border-line bg-slab-2 text-mute';
        const chestLook = isChest && state !== 'done' ? '!border-gold-deep !text-gold' : '';
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            style={{ x: OFFSETS[i % OFFSETS.length] }}
          >
            <div
              className={`${base} ${look} ${chestLook} ${isChest && nearChest ? 'animate-shake' : ''}`}
              aria-label={isChest ? 'Coffre du jour' : `Cas ${i + 1}`}
            >
              {isChest ? <Icon name="chest" size={26} /> : state === 'done' ? <Icon name="check" size={24} /> : i + 1}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
