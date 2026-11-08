'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';

// Coffre de ligue en attente : il tremble, s'ouvre, et les UA passent dans le solde de la boutique.
export default function ChestOpener({ amount, label }: { amount: number; label: string | null }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState<'closed' | 'opening' | 'open' | 'error'>('closed');
  const [got, setGot] = useState(0);

  const open = async () => {
    setState('opening');
    try {
      const res = await fetch('/api/ligue/chest', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error();
      await new Promise((r) => setTimeout(r, reduce ? 0 : 900));
      setGot(d.amount);
      setState('open');
      if (!reduce) confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, colors: ['#f2c14e', '#2fd28a', '#ffffff'] });
    } catch {
      setState('error');
    }
  };

  if (state === 'open') {
    return (
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border border-gold/50 bg-gold/10 p-5 text-center">
        <p className="font-display text-3xl font-extrabold text-gold">+{got.toLocaleString('fr-FR')} UA</p>
        <p className="mt-1 text-sm text-mute">Ajoutées à ton solde de la boutique.</p>
        <a href="/etudiant/boutique" className="mt-3 inline-block rounded-2xl bg-gold px-5 py-2.5 font-display text-xs font-bold uppercase text-stone">Aller à la boutique</a>
      </motion.div>
    );
  }
  return (
    <div className="rounded-3xl border border-gold/50 bg-slab p-5 text-center">
      <AnimatePresence>
        <motion.div
          className="mx-auto text-6xl"
          animate={reduce ? {} : state === 'opening' ? { rotate: [0, -12, 12, -12, 12, 0], scale: [1, 1.1, 1.1, 1.15, 1.2, 1.3] } : { rotate: [0, -4, 4, 0] }}
          transition={state === 'opening' ? { duration: 0.9 } : { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
        >🎁</motion.div>
      </AnimatePresence>
      <p className="mt-2 font-display text-base font-extrabold text-gold">{label ?? 'Coffre de ligue'}</p>
      <p className="text-xs text-mute">Ouvre-le pour récupérer tes UA.</p>
      <button onClick={open} disabled={state === 'opening'}
        className="mt-3 w-full rounded-2xl bg-gold px-5 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#9a6a12] active:translate-y-1 active:shadow-[0_1px_0_#9a6a12]">
        {state === 'opening' ? 'Ouverture…' : 'Ouvrir mon coffre'}
      </button>
      {state === 'error' && <p className="mt-2 text-xs text-heart">Impossible d&apos;ouvrir le coffre. Réessaie.</p>}
      <span className="sr-only">{amount} UA</span>
    </div>
  );
}
