'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// ===== GARDE ANTI-TRICHE — Dr. Stone Arena =====
// 1. AVANT le cas : avertissement bloquant — contenu flouté, le chronomètre ne démarre qu'après accord.
// 2. PENDANT le cas : quitter la page (changement d'application/onglet) → flou + cas ANNULÉ.
// Grâce courte (700 ms) : les gestes accidentels (panneau notifications) sont pardonnés.

const HIDDEN_GRACE_MS = 700;

type CaseGuardProps = {
  armed: boolean;               // true = protection active (cas en cours, non soumis)
  onAcknowledge: () => void;    // l'étudiant a accepté les règles → démarrer le chronomètre
  onViolation: () => void;      // sortie détectée → annuler le cas
  rules?: ReactNode;            // règles spécifiques au mode
  children: ReactNode;
};

export default function CaseGuard({ armed, onAcknowledge, onViolation, rules, children }: CaseGuardProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [violated, setViolated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const violationRef = useRef(false);
  const onViolationRef = useRef(onViolation);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);

  useEffect(() => {
    if (!armed || violationRef.current) return;

    const onVisibility = () => {
      if (document.hidden) {
        graceTimer.current = setTimeout(() => {
          if (document.hidden && !violationRef.current) {
            violationRef.current = true;
            setViolated(true);
            onViolationRef.current();
          }
        }, HIDDEN_GRACE_MS);
      } else if (graceTimer.current) {
        clearTimeout(graceTimer.current);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (graceTimer.current) clearTimeout(graceTimer.current);
    };
  }, [armed]);

  const hideContent = !acknowledged || (violated && !dismissed);

  return (
    <div className="relative">
      <div className={hideContent ? 'blur-lg select-none pointer-events-none' : ''}>
        {children}
      </div>

      {/* 1. Avertissement avant le cas (contenu flouté derrière) */}
      <AnimatePresence>
        {!acknowledged && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full text-center border-2 border-orange-400/50 my-8">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white mb-3">Règle anti-triche active</h2>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-5 text-left">
                {rules}
                <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-700">Une sortie accidentelle très brève (panneau de notifications) est pardonnée.</p>
              </div>
              <button
                onClick={() => { setAcknowledged(true); onAcknowledge(); }}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl uppercase tracking-wide"
              >
                ✅ J'ai compris — Commencer
              </button>
              <p className="text-[10px] text-gray-400 mt-3">Le chronomètre démarre quand tu appuies.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Violation : cas annulé */}
      <AnimatePresence>
        {violated && !dismissed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[90] bg-black/85 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="bg-red-950/95 border-2 border-red-500 rounded-3xl p-6 max-w-md w-full text-center">
              <div className="text-6xl mb-3">🚫</div>
              <h2 className="text-2xl font-black text-red-400 mb-2">CAS ANNULÉ</h2>
              <p className="text-sm text-white/60 mb-1">Sortie de l'application détectée pendant le cas.</p>
              <p className="text-xs text-red-300/70 mb-6">Le cas a été enregistré comme réponse fausse.</p>
              <button onClick={() => setDismissed(true)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl">
                Voir le résultat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}