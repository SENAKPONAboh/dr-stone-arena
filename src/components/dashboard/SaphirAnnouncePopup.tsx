'use client';

// Fenêtre d'annonce montrée UNE fois à chaque joueur : les 3 premiers de la ligue Saphir ont gagné 100 points.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Winner = { userId: string; name: string; stars: number };
const SAPHIR = '#6f9bff';

export default function SaphirAnnouncePopup({ winners, bonus, meId }: { winners: Winner[]; bonus: number; meId: string }) {
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    fetch('/api/ligue/annonce-saphir-vue', { method: 'POST' }).catch(() => {});
  };
  const iWon = winners.some((w) => w.userId === meId);

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="saphir" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          role="dialog" aria-modal="true" aria-label="Top 3 de la ligue Saphir"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border-2 text-center text-ink"
            style={{ borderColor: SAPHIR, background: 'radial-gradient(120% 80% at 50% 0%, #142449 0%, #0b1226 55%, #070b16 100%)', boxShadow: `0 0 80px ${SAPHIR}55` }}>
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-20 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl motion-safe:animate-pulse" style={{ background: `${SAPHIR}55` }} />
            <div className="relative px-6 pb-7 pt-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img src="/ligues/ligue-3.png" alt="Ligue Saphir" className="mx-auto h-28 w-40 object-contain"
                initial={{ y: -30, rotate: -8, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 14 }} />
              <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.28em]" style={{ color: SAPHIR }}>Ligue Saphir</p>
              <h2 className="mt-1 font-display text-xl font-black leading-tight">
                Les joueurs ayant atteint le top 3 de la ligue Saphir la semaine passée ont gagné {bonus} points.
              </h2>

              <ol className="mt-4 space-y-1.5 text-left">
                {winners.map((w, i) => (
                  <motion.li key={w.userId} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 + i * 0.08 }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${w.userId === meId ? 'border-sky/60 bg-sky/10' : 'border-white/10 bg-white/5'}`}>
                    <span className="w-5 text-center font-display text-xs font-extrabold" style={{ color: SAPHIR }}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-bold">{w.userId === meId ? `${w.name} (toi)` : w.name}</span>
                    {w.stars > 0 && <span className="shrink-0 rounded-full bg-gold/15 px-1.5 py-0.5 font-display text-[10px] font-extrabold text-gold">★ ×{w.stars}</span>}
                    <span className="shrink-0 font-display text-xs font-extrabold text-mala">+{bonus}</span>
                  </motion.li>
                ))}
              </ol>

              {iWon && <p className="mt-3 text-sm font-bold text-mala">Bravo ! Tes {bonus} points sont déjà ajoutés à ta ligue de cette semaine.</p>}

              <button onClick={close} className="mt-5 block w-full rounded-2xl py-3 font-display text-sm font-bold uppercase tracking-wide text-stone transition-transform active:translate-y-1"
                style={{ background: SAPHIR, boxShadow: '0 5px 0 #2f4fa8' }}>
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
