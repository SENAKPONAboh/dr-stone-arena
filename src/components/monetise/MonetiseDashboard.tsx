'use client';

import { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';

// Compteur animé (la cagnotte qui monte chiffre par chiffre)
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

// ⬇️ FIX : le type explicite Variants résout l'erreur "string not assignable to Easing"
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" },
  }),
};

export default function MonetiseDashboard({ uaBalance, streak, passExpiresAt }: {
  uaBalance: number; streak: number; passExpiresAt: string | null;
}) {
  const daysLeft = passExpiresAt
    ? Math.max(0, Math.ceil((new Date(passExpiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">

      {/* Hero cagnotte */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="animate-gold-flow bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-3xl p-8 text-center text-[#1a1308] shadow-2xl shadow-yellow-900/30"
      >
        <p className="text-sm font-bold uppercase tracking-widest opacity-70">Ta cagnotte</p>
        <p className="text-5xl font-extrabold mt-2 tabular-nums">
          🪙 <AnimatedCounter target={uaBalance} />
        </p>
        <p className="text-sm font-bold mt-2 opacity-60">Unités Arena disponibles</p>
        {uaBalance >= 200000 && (
          <Link href="/etudiant/monetise/cagnotte" className="inline-block mt-4 py-2 px-6 bg-[#1a1308] text-yellow-400 font-extrabold rounded-2xl text-sm uppercase tracking-wide">
            💰 Retrait disponible
          </Link>
        )}
      </motion.div>

      {/* Cartes en cascade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">🔥 Ta Flamme</p>
          <p className="text-4xl font-extrabold text-orange-400">{streak} <span className="text-xl">jours</span></p>
          <p className="text-xs text-white/40 mt-2">Condition Rush : ≥ 5 jours cette semaine</p>
        </motion.div>

        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">🪙 Ton Pass</p>
          <p className="text-2xl font-extrabold text-yellow-400">✅ Actif</p>
          <p className="text-xs text-white/40 mt-2">{daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</p>
        </motion.div>

        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">📈 Rythme quotidien</p>
          <p className="text-2xl font-extrabold text-emerald-400">+1 000 UA / cas</p>
          <p className="text-xs text-white/40 mt-2">10 cas par jour, lundi → vendredi</p>
        </motion.div>
      </div>

      {/* Statut des phases */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-6"
      >
        <h2 className="font-extrabold text-white/60 text-sm uppercase tracking-wider mb-3">🚧 Construction en cours</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <p className="bg-white/5 p-3 rounded-xl text-center text-white/40">U2 — Achat du Pass<br /><span className="text-yellow-500/50">en approche</span></p>
          <p className="bg-white/5 p-3 rounded-xl text-center text-white/40">U3 — Gain des UA</p>
          <p className="bg-white/5 p-3 rounded-xl text-center text-white/40">U4 — Mode Rush</p>
          <p className="bg-white/5 p-3 rounded-xl text-center text-white/40">U6 — Boutique</p>
        </div>
      </motion.div>
    </div>
  );
}