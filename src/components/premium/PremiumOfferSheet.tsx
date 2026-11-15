'use client';

// ===== FENÊTRE « PASSE PREMIUM » — Dr. Stone Arena =====
// S'ouvre quand l'étudiant bute sur une limite que le Premium améliore :
//   - « lives »  : plus de vies (le Premium les fait revenir plus vite) ;
//   - « duels »  : limite de duels du jour atteinte (le Premium en donne plus).
// Elle présente seulement les paliers SUPÉRIEURS au palier actuel ; au Premium III, rien ne s'affiche.
// Purement visuel : aucun appel serveur, le bouton mène à la page /etudiant/premium (paiement inchangé).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Icon from '@/components/ui/Icon';
import { PREMIUM_PLANS, PREMIUM_MONTHLY_UA } from '@/lib/premium';
import { FREE_DAILY_DUELS } from '@/lib/decouverte';

export type PremiumReason = 'lives' | 'duels';

const COPY: Record<PremiumReason, { icon: 'heart' | 'swords'; color: string; title: string; text: string }> = {
  lives: {
    icon: 'heart',
    color: 'text-heart',
    title: 'Plus de vies ?',
    text: 'Pas besoin d’attendre demain : avec le Premium, tes vies reviennent bien plus vite et tu finis ta garde du jour.',
  },
  duels: {
    icon: 'swords',
    color: 'text-heart',
    title: 'Limite de duels atteinte',
    text: 'Tu as joué tous tes duels du jour. Avec le Premium, tu en joues beaucoup plus chaque jour et tu grimpes plus vite dans ta ligue.',
  },
};

export function hasBetterPlan(tier: number | null | undefined): boolean {
  return PREMIUM_PLANS.some(p => p.tier > (tier ?? 0));
}

export default function PremiumOfferSheet({ open, onClose, reason, tier }: {
  open: boolean;
  onClose: () => void;
  reason: PremiumReason;
  tier: number | null | undefined;
}) {
  const reduce = useReducedMotion();
  const plans = PREMIUM_PLANS.filter(p => p.tier > (tier ?? 0));
  const copy = COPY[reason];

  // Échap ferme la fenêtre
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (plans.length === 0) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="premium-offer"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="premium-offer-title"
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-gold/40 bg-slab p-6 pb-8 sm:rounded-3xl"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} aria-label="Fermer"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slab-2 text-mute">
              <Icon name="close" size={18} />
            </button>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <motion.div
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold"
                animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon name="crown" size={34} />
                <span className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slab ${copy.color}`}>
                  <Icon name={copy.icon} size={16} />
                </span>
              </motion.div>
            </div>

            <h2 id="premium-offer-title" className="text-center font-display text-xl font-extrabold text-ink">{copy.title}</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-mute">{copy.text}</p>

            <ul className="mt-5 space-y-2.5">
              {plans.map((plan, i) => (
                <motion.li key={plan.tier}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.12 + i * 0.06 }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-slab-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-ink">{plan.name}</p>
                    <p className="text-xs text-mute">
                      {reason === 'lives'
                        ? <>1 vie <b className="text-ink">{plan.regenLabel}</b> <span>(gratuit : toutes les 24 h)</span></>
                        : <><b className="text-ink">{plan.dailyDuels} duels</b> par jour <span>(gratuit : {FREE_DAILY_DUELS})</span></>}
                    </p>
                    <p className="text-[11px] text-gold">+ {PREMIUM_MONTHLY_UA[plan.tier].toLocaleString('fr-FR')} UA de boutique chaque mois</p>
                  </div>
                  <span className="shrink-0 font-display text-sm font-extrabold tabular-nums text-gold">{plan.priceLabel}</span>
                </motion.li>
              ))}
            </ul>

            <p className="mt-4 text-center text-[11px] text-mute">Le Premium ne donne jamais d’XP en plus : seulement plus de temps de jeu.</p>

            <Link href="/etudiant/premium" onClick={onClose}
              className="mt-5 block rounded-2xl bg-gold px-5 py-3.5 text-center font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#9a6a12] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#9a6a12]">
              Voir l’offre Premium
            </Link>
            <button onClick={onClose} className="mt-3 w-full py-2 text-center text-sm font-bold text-mute">
              Plus tard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Version qui s'ouvre toute seule à l'affichage (écrans « Plus de vies »).
 * Pour ne pas harceler : au plus une ouverture automatique toutes les 3 heures par motif
 * (mémorisée dans le navigateur). Le bouton `withButton` permet de la rouvrir à la main.
 */
const AUTO_EVERY_MS = 3 * 60 * 60 * 1000;

export function PremiumOfferAuto({ reason, tier, withButton = true }: {
  reason: PremiumReason; tier: number | null | undefined; withButton?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasBetterPlan(tier)) return;
    const key = `premium-offer-${reason}`;
    let due = true;
    try {
      const last = Number(localStorage.getItem(key) || 0);
      due = Date.now() - last > AUTO_EVERY_MS;
      if (due) localStorage.setItem(key, String(Date.now()));
    } catch { /* stockage indisponible : on l'ouvre quand même */ }
    if (!due) return;
    const t = setTimeout(() => setOpen(true), 600); // laisse d'abord apparaître l'écran
    return () => clearTimeout(t);
  }, [reason, tier]);

  if (!hasBetterPlan(tier)) return null;

  return (
    <>
      {withButton && (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/50 bg-gold/10 px-5 py-3 font-display text-xs font-bold uppercase tracking-wide text-gold">
          <Icon name="crown" size={16} /> {reason === 'lives' ? 'Récupérer mes vies plus vite' : 'Plus de duels avec Premium'}
        </button>
      )}
      <PremiumOfferSheet open={open} onClose={() => setOpen(false)} reason={reason} tier={tier} />
    </>
  );
}
