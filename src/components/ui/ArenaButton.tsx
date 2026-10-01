'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'mala' | 'gold' | 'ghost' | 'danger';

const STYLES: Record<Variant, string> = {
  mala: 'bg-mala text-stone shadow-[0_5px_0_#0f7a4f] active:shadow-[0_1px_0_#0f7a4f]',
  gold: 'bg-gold text-stone shadow-[0_5px_0_#9a6a12] active:shadow-[0_1px_0_#9a6a12]',
  ghost: 'bg-slab-2 text-ink border border-line shadow-[0_5px_0_#26332e] active:shadow-[0_1px_0_#26332e]',
  danger: 'bg-heart text-white shadow-[0_5px_0_#a1233b] active:shadow-[0_1px_0_#a1233b]',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  full?: boolean;
};

// Bouton en relief : s'enfonce au toucher (translateY + ombre pleine réduite).
export default function ArenaButton({ variant = 'mala', full, className = '', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-display text-sm font-bold uppercase tracking-wide transition-[transform,box-shadow] duration-75 active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${STYLES[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
