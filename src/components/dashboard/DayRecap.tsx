'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { animate, motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Icon from '@/components/ui/Icon';
import BackgroundCells from '@/components/ui/BackgroundCells';
import ShareButton from '@/components/ui/ShareButton';

type Props = { total: number; correct: number; xp: number; streak: number; nextBatch: string };

// Écran de fin de garde : score animé, Flamme qui grandit, confettis légers.
export default function DayRecap({ total, correct, xp, streak, nextBatch }: Props) {
  const reduce = useReducedMotion();
  const [score, setScore] = useState(reduce ? correct : 0);

  useEffect(() => {
    if (reduce) return;
    const c = animate(0, correct, { duration: 1.2, ease: 'easeOut', onUpdate: (v) => setScore(Math.round(v)) });
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#2fd28a', '#e9f1ed', '#ff8a3d'], disableForReducedMotion: true });
    return () => c.stop();
  }, [correct, reduce]);

  return (
    <div className="relative flex min-h-[75vh] items-center justify-center p-2">
      <BackgroundCells />
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-slab p-8 text-center">
        <motion.div initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-flame/15 text-flame">
          <span className="animate-flame-flicker inline-flex"><Icon name="flame" size={48} /></span>
        </motion.div>
        <h2 className="font-display text-xl font-extrabold text-ink">Garde du jour terminée</h2>
        <p className="mt-1 text-sm text-mute">Série en cours : <b className="text-flame">{streak} jour{streak > 1 ? 's' : ''}</b></p>

        <p className="mt-6 font-display text-5xl font-extrabold tabular-nums text-mala">{score}<span className="text-2xl text-mute">/{total}</span></p>
        <p className="text-xs font-bold uppercase tracking-wider text-mute">diagnostics posés</p>
        <p className="mt-3 inline-block rounded-full bg-mala/15 px-4 py-1.5 font-display text-sm font-bold text-mala">+{xp} XP aujourd'hui</p>

        <div className="mt-5 flex justify-center">
          <ShareButton type="jour" />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-mute">Prochaine consultation demain : {nextBatch} nouveaux cas t'attendent.</p>
        <Link href="/etudiant"
          className="mt-5 inline-block rounded-2xl bg-mala px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
