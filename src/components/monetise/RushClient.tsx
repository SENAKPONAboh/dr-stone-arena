'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  RUSH_MAX_ERRORS,
  RUSH_WEEKEND_CAP_UA,
  RUSH_PALIER_1_UA,
  RUSH_PALIER_2_UA,
  RUSH_PALIER_3_UA,
} from '@/lib/monetise';

// ⚠️ correctAnswer et explanation ne sont JAMAIS transmis avant la réponse :
// ils arrivent uniquement dans la réponse du serveur APRÈS soumission (sécurité économique).
type RushCase = {
  id: string; title: string; statement: string; options: string[];
  durationMax: number; difficulty: string; subject: string; chapter: string;
};

type RushSessionProps = {
  id: string; errors: number; currentStreak: number; attemptNumber: number;
};

type SubmitResult = {
  isCorrect: boolean; errors: number; currentStreak: number; maxErrors: number;
  uaEarned: number; balanceAfter: number; sessionStatus: string;
  explanation: string; correctAnswer: string;
  chestGranted?: boolean; chestItems?: string[];
};

const PALIERS = [
  { threshold: 10, amount: RUSH_PALIER_1_UA },
  { threshold: 15, amount: RUSH_PALIER_2_UA },
  { threshold: 25, amount: RUSH_PALIER_3_UA },
];

const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff'];

export default function RushClient({
  clinicalCase, session, uaBalance, weekendTotal,
}: {
  clinicalCase: RushCase;
  session: RushSessionProps;
  uaBalance: number;
  weekendTotal: number;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<'countdown' | 'question' | 'feedback' | 'finale'>(
    session.currentStreak === 0 && session.errors === 0 ? 'countdown' : 'question'
  );
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(clinicalCase.durationMax);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [serverError, setServerError] = useState('');
  const [balance, setBalance] = useState(uaBalance);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [navCount, setNavCount] = useState(0);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const difficultyColors: Record<string, string> = {
    FACILE: 'bg-green-400/20 text-green-300',
    MOYEN: 'bg-orange-400/20 text-orange-300',
    DIFFICILE: 'bg-red-400/20 text-red-300',
  };

  // Valeurs affichées : props au départ, réponse du serveur ensuite
  const streak = result?.currentStreak ?? session.currentStreak;
  const errors = result?.errors ?? session.errors;
  const nextPalier = PALIERS.find(p => p.threshold > streak);
  const progressPct = Math.min(100, (streak / 25) * 100);
  const palierReached = result
    ? (result.currentStreak >= 25 ? 3 : result.currentStreak >= 15 ? 2 : result.currentStreak >= 10 ? 1 : 0)
    : 0;

  // ==== INTRO : 3-2-1-GO (uniquement au lancement d'une nouvelle tentative) ====
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown < 0) { setPhase('question'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), countdown === 0 ? 650 : 850);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ==== CHRONOMÈTRE ====
  useEffect(() => {
    if (phase !== 'question') return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  // ==== NOUVEAU CAS (après router.refresh) : reset complet ====
  const prevCaseId = useRef<string | null>(null);
  useEffect(() => {
    if (prevCaseId.current === null && navCount === 0) {
      prevCaseId.current = clinicalCase.id;
      return; // premier montage : laisser l'intro se jouer
    }
    prevCaseId.current = clinicalCase.id;
    setTimeLeft(clinicalCase.durationMax);
    setSelectedAnswer(null);
    setResult(null);
    setServerError('');
    setRefreshing(false);
    setPhase('question');
  }, [clinicalCase.id, navCount]);

  const handleSubmit = async (timeout = false) => {
    if (phase !== 'question') return;
    if (!selectedAnswer && !timeout) return;
    setPhase('feedback');
    const timeSpent = clinicalCase.durationMax - timeLeft;

    try {
      const res = await fetch('/api/monetise/rush/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          clinicalCaseId: clinicalCase.id,
          userAnswer: timeout ? 'Aucune réponse (Temps écoulé)' : selectedAnswer,
          timeSpent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Erreur serveur');
        return;
      }
      setResult(data);
      setBalance(data.balanceAfter);
      setEarnedTotal(e => e + (data.uaEarned ?? 0));

      // 🎉 Confettis dosés : touche légère à chaque bonne réponse, explosion au palier
      if (data.isCorrect) {
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.75 }, colors: GOLD_CONFETTI });
      }
      if (data.uaEarned > 0) {
        setTimeout(() => {
          confetti({ particleCount: 130, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors: GOLD_CONFETTI });
        }, 300);
      }

      // Fin de tentative → laisser respirer le feedback, puis écran de fin
      if (data.sessionStatus && data.sessionStatus !== 'EN_COURS') {
        setTimeout(() => setPhase('finale'), data.uaEarned > 0 ? 2600 : 2000);
      }
    } catch {
      setServerError('Erreur de connexion au serveur.');
    }
  };

  // ==== ÉCRAN DE FIN : pluie de confettis si palier 3 ====
  useEffect(() => {
    if (phase !== 'finale' || result?.sessionStatus !== 'TERMINE_P3') return;
    const end = Date.now() + 2400;
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return; }
      confetti({
        particleCount: 55, spread: 70, startVelocity: 38,
        origin: { x: Math.random(), y: Math.random() * 0.35 },
        colors: GOLD_CONFETTI,
      });
    }, 380);
    return () => clearInterval(interval);
  }, [phase, result]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a05] via-[#1a1308] to-[#0f0a05] py-6 px-4 relative">
      {/* ⚠️ DANGER : dernière vie — vignette rouge pulsée */}
      {errors >= RUSH_MAX_ERRORS && phase === 'question' && (
        <div className="fixed inset-0 pointer-events-none border-4 border-red-500/50 animate-pulse z-10" />
      )}

      <div className="max-w-3xl mx-auto">
        {/* ===== HUD ===== */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center gap-3 mb-4">
          <span className="text-xs font-extrabold uppercase tracking-wider bg-yellow-500 text-[#1a1308] px-3 py-1.5 rounded-full whitespace-nowrap">
            ⚔️ Rush · Tentative #{session.attemptNumber}
          </span>
          <div className="flex items-center gap-1 text-lg">
            {Array.from({ length: RUSH_MAX_ERRORS }).map((_, i) => (
              <motion.span key={i} animate={i < errors ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.4 }}>
                {i < errors ? '💔' : '❤️'}
              </motion.span>
            ))}
          </div>
          <div className={`px-4 py-2 rounded-xl font-extrabold text-lg ${timeLeft <= 10 && phase === 'question' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 border-2 border-yellow-500/30 text-yellow-300'}`}>
            ⏱️ {phase === 'countdown' ? clinicalCase.durationMax : timeLeft}s
          </div>
        </motion.div>

        {/* ===== SÉRIE + PALIERS + CAGNOTTE ===== */}
        <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2 gap-2">
            <p className="text-sm font-extrabold text-white whitespace-nowrap">
              <span className="inline-block animate-flame">🔥</span> Série : <span className="text-yellow-300">{streak}</span>
            </p>
            <p className="text-sm font-extrabold text-yellow-300 rounded-xl px-3 py-1 animate-glow-gold whitespace-nowrap">
              🪙 {balance.toLocaleString('fr-FR')} UA
            </p>
          </div>
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
            {[10, 15, 25].map(t => (
              <div key={t} className="absolute top-0 h-full w-0.5 bg-white/40" style={{ left: `${(t / 25) * 100}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-white/40 font-bold">
              {nextPalier ? `Prochain palier : ${nextPalier.threshold} réponses (+${nextPalier.amount.toLocaleString('fr-FR')} UA)` : '🏆 Palier maximum en vue !'}
            </p>
            <p className="text-[10px] text-white/30 font-bold">Week-end : {weekendTotal.toLocaleString('fr-FR')} / {RUSH_WEEKEND_CAP_UA.toLocaleString('fr-FR')} UA</p>
          </div>
        </div>

        {/* ===== CARTE DU CAS ===== */}
        {(phase === 'question' || phase === 'feedback') && (
          <motion.div
            key={clinicalCase.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="bg-white/5 backdrop-blur rounded-3xl border border-yellow-500/20 p-6 md:p-8"
          >
            <div className="flex justify-between items-start gap-3 mb-6">
              <div>
                <span className="text-xs font-bold text-yellow-200/50 uppercase tracking-wider">{clinicalCase.subject} • {clinicalCase.chapter}</span>
                <h1 className="text-2xl font-extrabold text-white mt-1">{clinicalCase.title}</h1>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${difficultyColors[clinicalCase.difficulty]}`}>{clinicalCase.difficulty}</span>
            </div>

            <p className="text-white/90 text-lg mb-8 leading-relaxed">{clinicalCase.statement}</p>

            <div className="space-y-3">
              {clinicalCase.options.map((option, index) => {
                let buttonClass = 'w-full text-left p-4 rounded-2xl border-2 flex items-center gap-4 ';
                if (phase === 'feedback' && result) {
                  if (option === result.correctAnswer) buttonClass += 'border-green-400 bg-green-400/10 text-green-300 font-bold';
                  else if (option === selectedAnswer) buttonClass += 'border-red-400 bg-red-400/10 text-red-300';
                  else buttonClass += 'border-white/10 text-white/30 opacity-70';
                } else {
                  buttonClass += selectedAnswer === option
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200 font-bold shadow-lg shadow-yellow-900/30'
                    : 'border-white/10 text-white/90 hover:border-yellow-500/50';
                }
                return (
                  <motion.button
                    key={index}
                    onClick={() => phase === 'question' && setSelectedAnswer(option)}
                    disabled={phase !== 'question'}
                    whileHover={phase === 'question' ? { scale: 1.02 } : undefined}
                    whileTap={phase === 'question' ? { scale: 0.98 } : undefined}
                    animate={phase === 'feedback' && result && !result.isCorrect && option === selectedAnswer ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                    className={buttonClass}
                  >
                    <span className="w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-sm flex-shrink-0 bg-white/10 text-yellow-200/60">{letters[index]}</span>
                    <span className="flex-1">{option}</span>
                  </motion.button>
                );
              })}
            </div>

            {phase === 'question' && (
              <motion.button
                onClick={() => handleSubmit(false)}
                disabled={!selectedAnswer}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full mt-8 py-4 bg-yellow-500 text-[#1a1308] text-lg font-extrabold rounded-2xl uppercase tracking-wide disabled:opacity-40"
              >
                Valider ⚡
              </motion.button>
            )}

            {phase === 'feedback' && (
              <div className="mt-8 space-y-4">
                {serverError && (
                  <div className="bg-red-400/10 border-2 border-red-400/30 rounded-2xl p-5 text-center">
                    <p className="text-red-300 font-bold mb-3">{serverError}</p>
                    <button onClick={() => router.refresh()} className="py-2 px-6 bg-yellow-500 text-[#1a1308] font-bold rounded-xl">Recharger</button>
                  </div>
                )}
                {!result && !serverError && (
                  <p className="text-center text-yellow-300 font-bold animate-pulse py-4">⏳ Vérification…</p>
                )}
                {result && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={`p-5 rounded-2xl text-center font-black text-xl ${result.isCorrect ? 'bg-green-400/10 border-2 border-green-400/40 text-green-300' : 'bg-red-400/10 border-2 border-red-400/40 text-red-300'}`}
                    >
                      {result.isCorrect
                        ? `✅ EXCELLENT — série ${result.currentStreak} !`
                        : errors >= RUSH_MAX_ERRORS
                          ? `❌ ERREUR ${result.errors}/${RUSH_MAX_ERRORS} — ⚠️ DERNIÈRE CHANCE !`
                          : `❌ ERREUR — ${result.errors}/${RUSH_MAX_ERRORS} tolérée${result.errors > 1 ? 's' : ''}`}
                    </motion.div>

                    {result.uaEarned > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 18 }}
                        className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-2xl p-5 text-center overflow-hidden"
                      >
                        <div className="h-9 flex items-center justify-center overflow-hidden">
                          <span className="text-2xl font-black text-yellow-300 animate-coin">🪙 +{result.uaEarned.toLocaleString('fr-FR')} UA</span>
                        </div>
                        <p className="font-extrabold text-yellow-200 mt-1">🎉 PALIER {palierReached} ATTEINT !</p>
                      </motion.div>
                    )}

                    <div className="p-5 rounded-2xl bg-white/5 border border-yellow-500/20">
                      <p className="text-white/60 font-semibold mb-2">💡 Correction :</p>
                      <p className="text-white/50 leading-relaxed">{result.explanation}</p>
                    </div>

                    {result.sessionStatus === 'EN_COURS' ? (
                      <motion.button
                        onClick={() => { setNavCount(c => c + 1); setRefreshing(true); router.refresh(); }}
                        disabled={refreshing}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-4 bg-yellow-500 text-[#1a1308] font-extrabold rounded-2xl uppercase tracking-wide text-lg disabled:opacity-50"
                      >
                        {refreshing ? '⏳ Chargement…' : 'Cas suivant ⚡'}
                      </motion.button>
                    ) : (
                      <p className="text-center text-yellow-300 font-bold animate-pulse py-2">Fin de la tentative…</p>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ===== INTRO : 3-2-1-GO ===== */}
      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div key="intro" exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0f0a05]/95 flex flex-col items-center justify-center p-4">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-yellow-300 font-extrabold uppercase tracking-[0.3em] text-xs sm:text-sm mb-8 text-center">
              ⚔️ Rush du week-end — Tentative #{session.attemptNumber}
            </motion.p>
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 2.8, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="text-8xl font-black text-yellow-400"
              >
                {countdown > 0 ? countdown : 'GO !'}
              </motion.div>
            </AnimatePresence>
            <p className="text-white/40 text-xs sm:text-sm mt-10 font-bold text-center">
              3 erreurs tolérées · Paliers 10 / 15 / 25 · Jusqu'à {(RUSH_PALIER_1_UA + RUSH_PALIER_2_UA + RUSH_PALIER_3_UA).toLocaleString('fr-FR')} UA
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== ÉCRAN DE FIN ===== */}
      <AnimatePresence>
        {phase === 'finale' && result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-[#0f0a05]/95 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="max-w-md w-full text-center my-8"
            >
              {result.sessionStatus === 'TERMINE_P3' && (
                <>
                  <div className="text-7xl mb-4 animate-float">🏆</div>
                  <h2 className="text-4xl font-black text-yellow-300 mb-2">PALIER 3 ATTEINT !</h2>
                  <p className="text-white/60 mb-6">Série parfaite de 25 réponses — Tentative #{session.attemptNumber}</p>
                </>
              )}
              {result.sessionStatus === 'TERMINE_ECHEC' && (
                <>
                  <div className="text-7xl mb-4">💀</div>
                  <h2 className="text-4xl font-black text-red-400 mb-2">RUSH TERMINÉ</h2>
                  <p className="text-white/60 mb-6">4ᵉ erreur fatale — série atteinte : {streak}. La médecine ne pardonne pas… reviens plus fort !</p>
                </>
              )}
              {result.sessionStatus === 'TERMINE_PLAFOND' && (
                <>
                  <div className="text-7xl mb-4 animate-float">📊</div>
                  <h2 className="text-4xl font-black text-amber-300 mb-2">PLAFOND DU WEEK-END</h2>
                  <p className="text-white/60 mb-6">Maximum de {RUSH_WEEKEND_CAP_UA.toLocaleString('fr-FR')} UA de récompenses atteint. Reviens samedi prochain !</p>
                </>
              )}

              {result.chestGranted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 240, damping: 16 }}
                  className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-400/50 rounded-2xl p-6 mb-4"
                >
                  <p className="font-black text-amber-300 mb-2 text-lg">🎁 COFFRE D'ÉLITE DU MAJOR</p>
                  <p className="text-white/70 text-sm">{(result.chestItems ?? []).join(' + ')} — ajoutés à ton inventaire</p>
                </motion.div>
              )}

              <div className="bg-white/5 rounded-2xl p-4 mb-6 text-sm">
                <p className="text-yellow-300 font-extrabold">🪙 Cagnotte : {balance.toLocaleString('fr-FR')} UA</p>
                {earnedTotal > 0 && <p className="text-white/50 mt-1">+{earnedTotal.toLocaleString('fr-FR')} UA gagnés sur cette tentative</p>}
                <p className="text-white/40 mt-1">Série finale : {streak} · Erreurs : {errors}</p>
              </div>

              <a href="/etudiant/monetise/rush" className="block w-full py-4 bg-yellow-500 text-[#1a1308] font-extrabold rounded-2xl uppercase tracking-wide text-center">
                ⚔️ Retour au Rush
              </a>
              <a href="/etudiant/monetise" className="block py-3 text-white/40 text-sm font-bold hover:text-yellow-300 text-center">
                Retour au dashboard
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}