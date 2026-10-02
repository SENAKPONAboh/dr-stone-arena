'use client';

import type { ReactNode } from 'react';

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const BOX: Record<AnswerState, string> = {
  idle: 'bg-slab border-line shadow-[0_4px_0_rgb(var(--line-rgb))]',
  selected: 'bg-sky/10 border-sky shadow-[0_4px_0_#2b7fa6]',
  correct: 'bg-mala/15 border-mala shadow-[0_4px_0_#0f7a4f]',
  wrong: 'bg-heart/15 border-heart shadow-[0_4px_0_#a1233b] animate-shake',
  dimmed: 'bg-slab border-line opacity-40 shadow-[0_4px_0_rgb(var(--line-rgb))]',
};
const BADGE: Record<AnswerState, string> = {
  idle: 'bg-slab-2 text-mute',
  selected: 'bg-sky text-stone',
  correct: 'bg-mala text-stone',
  wrong: 'bg-heart text-white',
  dimmed: 'bg-slab-2 text-mute',
};

type Props = {
  letter: string;
  state?: AnswerState;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

// Réponse A/B/C/D en relief : s'enfonce au toucher, change de couleur selon l'état.
export default function AnswerOption({ letter, state = 'idle', disabled, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left font-body text-[15px] font-semibold text-ink transition-[transform,box-shadow,opacity] duration-75 ${disabled ? '' : 'active:translate-y-1 active:shadow-none'} ${BOX[state]}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${BADGE[state]}`}>{letter}</span>
      <span className="min-w-0 flex-1 whitespace-pre-line break-words">{children}</span>
    </button>
  );
}
