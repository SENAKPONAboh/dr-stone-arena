'use client';

import Coin from '@/components/ui/Coin';
import { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { WITHDRAWAL_MIN_UA } from '@/lib/monetise';

function AnimatedCounter({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <span>{value.toLocaleString("fr-FR")}</span>;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" },
  }),
};

export default function MonetiseDashboard({ uaBalance, uaRecharged, streak, passExpiresAt }: {
  uaBalance: number; uaRecharged: number; streak: number; passExpiresAt: string | null;
}) {
  const merit = Math.max(0, uaBalance - Math.min(uaRecharged, uaBalance));
  const credits = uaBalance - merit;
  const daysLeft = passExpiresAt
    ? Math.max(0, Math.ceil((new Date(passExpiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">

      {/* Hero : points de mérite */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gold p-8 text-center text-stone shadow-[0_6px_0_#9a6a12]"
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/25 animate-shimmer" />
        <p className="relative text-sm font-bold uppercase tracking-widest opacity-70">Mon trésor Élite</p>
        <p className="relative mt-2 font-display text-5xl font-extrabold tabular-nums">
          <Coin /> <AnimatedCounter target={uaBalance} />
        </p>
        <div className="relative mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-stone/15 px-3 py-1">⭐ Points de mérite : {merit.toLocaleString('fr-FR')}</span>
          {credits > 0 && <span className="rounded-full bg-stone/15 px-3 py-1">⚡ Crédits de recharge : {credits.toLocaleString('fr-FR')}</span>}
        </div>
        {merit >= WITHDRAWAL_MIN_UA && (
          <Link href="/etudiant/monetise/cagnotte" className="relative mt-4 inline-block rounded-2xl bg-stone px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-gold">
            Prime Arena disponible
          </Link>
        )}
        <a href="/etudiant/monetise/jouer" className="relative mt-4 inline-block rounded-2xl bg-stone px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-gold">
          ▶ Jouer mes 10 cas du jour
        </a>
      </motion.div>

      {/* CTA Rush + Boutique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href="/etudiant/monetise/rush" className="block rounded-3xl border-2 border-heart/30 bg-heart/10 p-5 transition-colors hover:border-heart/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-heart animate-flame-flicker inline-flex"><Icon name="swords" size={34} /></span>
              <div>
                <p className="font-display text-sm font-extrabold text-ink">Mode Rush</p>
                <p className="mt-0.5 text-xs text-mute">Week-end · 3 erreurs max · paliers de mérite</p>
              </div>
            </div>
            <span className="font-display text-lg font-extrabold text-gold">→</span>
          </div>
        </a>
        <a href="/etudiant/monetise/boutique" className="block rounded-3xl border-2 border-gold/30 bg-gold/10 p-5 transition-colors hover:border-gold/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gold inline-flex"><Icon name="chest" size={34} /></span>
              <div>
                <p className="font-display text-sm font-extrabold text-ink">Boutique</p>
                <p className="mt-0.5 text-xs text-mute">Objets Flamme · Rush · Coffres · Personnalisation</p>
              </div>
            </div>
            <span className="font-display text-lg font-extrabold text-gold">→</span>
          </div>
        </a>
      </div>

      {/* Cartes en cascade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-3xl border border-gold/20 bg-white/5 p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Ta Flamme</p>
          <p className="flex items-center gap-2 font-display text-3xl font-extrabold text-flame">
            <span className="inline-flex animate-flame-flicker"><Icon name="flame" size={30} /></span>{streak} <span className="text-base">jours</span>
          </p>
          <p className="mt-2 text-xs text-mute">Condition Rush : ≥ 5 jours cette semaine</p>
        </motion.div>

        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-3xl border border-gold/20 bg-white/5 p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Ton Pass Élite</p>
          <p className="font-display text-xl font-extrabold text-gold">Actif</p>
          <p className="mt-2 text-xs text-mute">{daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</p>
        </motion.div>

        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-3xl border border-gold/20 bg-white/5 p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Rythme quotidien</p>
          <p className="font-display text-base font-extrabold text-mala">Chaque cas réussi compte pour ta Prime</p>
          <p className="mt-2 text-xs text-mute">10 cas par jour, lundi → vendredi</p>
        </motion.div>
      </div>
    </div>
  );
}
