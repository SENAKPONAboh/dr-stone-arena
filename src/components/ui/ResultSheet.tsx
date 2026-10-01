'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  correct: boolean;
  title?: string;
  children?: ReactNode; // explication
  action?: ReactNode; // bouton « Continuer »
};

// Panneau de correction qui monte du bas avec un léger rebond.
export default function ResultSheet({ open, correct, title, children, action }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className={`fixed inset-x-0 bottom-0 z-[90] rounded-t-3xl border-t-2 p-5 pb-8 ${correct ? 'border-mala bg-[#0f2a20]' : 'border-heart bg-[#2a1219]'}`}
        >
          <div className="mx-auto max-w-xl">
            <p className={`font-display text-lg font-extrabold ${correct ? 'text-mala' : 'text-heart'}`}>
              {title ?? (correct ? 'Diagnostic posé !' : 'Pas grave, voici le raisonnement')}
            </p>
            {children && <div className="mt-2 whitespace-pre-line font-body text-sm leading-relaxed text-ink">{children}</div>}
            {action && <div className="mt-4">{action}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
