'use client';

import Coin from '@/components/ui/Coin';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { UA_PER_CASE } from '@/lib/monetise';
import CaseGuard from '@/components/ui/CaseGuard';
import LastSecondsAlert from '@/components/ui/LastSecondsAlert';

// ⚠️ correctAnswer et explanation ne sont JAMAIS transmis au navigateur avant la réponse.
type ClinicalCaseProps = {
  progressLabel?: string;
  clinicalCase: {
    id: string;
    title: string;
    statement: string;
    options: string[];
    durationMax: number;
    difficulty: string;
    subject: string;
    chapter: string;
  };
};

type SubmitResult = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  uaEarned: number;
  balanceAfter: number;
  streak: number;
  chestUnlocked?: boolean;
  newBadges?: { name: string; icon: string }[];
};

const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff'];

export default function MonetisePlayClient({ clinicalCase, progressLabel }: ClinicalCaseProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(clinicalCase.durationMax);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardReady, setGuardReady] = useState(false);
  const [wasViolation, setWasViolation] = useState(false);

  // Chronomètre — démarre SEULEMENT après l'accord de l'avertissement anti-triche
  useEffect(() => {
    if (isSubmitted || !guardReady) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitted, guardReady]);

  const handleSubmit = async (timeout = false, violation = false) => {
    if (!selectedAnswer && !timeout && !violation) return;
    setLoading(true);
    setIsSubmitted(true);
    setWasViolation(violation);

    const timeSpent = clinicalCase.durationMax - timeLeft;

    try {
      const res = await fetch('/api/monetise/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalCaseId: clinicalCase.id,
          userAnswer: violation ? "Cas annulé — sortie de l'application" : timeout ? "Aucune réponse (Temps écoulé)" : selectedAnswer,
          timeSpent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (data.isCorrect) {
          confetti({ particleCount: 45, spread: 60, origin: { y: 0.75 }, colors: GOLD_CONFETTI });
        }
      } else {
        setServerError(data?.error || 'Erreur serveur');
      }
    } catch (e) {
      console.error(e);
      setServerError("Impossible de joindre le serveur. Vérifie ta connexion puis réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    FACILE: 'bg-green-400/20 text-green-300',
    MOYEN: 'bg-orange-400/20 text-orange-300',
    DIFFICILE: 'bg-red-400/20 text-red-300',
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <CaseGuard
      armed={guardReady && !isSubmitted}
      onAcknowledge={() => setGuardReady(true)}
      onViolation={() => handleSubmit(false, true)}
      rules={
        <>
          <p>🔒 Si tu quittes cette page (changement d'application, d'onglet, écran d'accueil) pendant le cas → <b>le cas est immédiatement annulé</b>.</p>
          <p><Coin /> Cas annulé = réponse fausse : <b>0 point de mérite</b>.</p>
        </>
      }
    >
      <LastSecondsAlert remaining={timeLeft} active={guardReady && !isSubmitted} />
      <div className="min-h-screen elite-bg py-8 px-4">
        <div className="max-w-3xl mx-auto">

          {/* En-tête */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-6">
            <div>
              <span className="text-xs font-bold text-yellow-200/50 uppercase tracking-wider">{clinicalCase.subject} • {clinicalCase.chapter}</span>
              <h1 className="text-2xl font-extrabold text-white mt-1">{clinicalCase.title}</h1>
              {progressLabel && (
                <span className="inline-block mt-2 text-xs font-extrabold bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">{progressLabel}</span>
              )}
            </div>
            <div className={`px-4 py-2 rounded-xl font-extrabold text-lg ${timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 border-2 border-yellow-500/30 text-yellow-300'}`}>
              ⏱️ {timeLeft}s
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 backdrop-blur rounded-3xl border border-yellow-500/20 p-6 md:p-8">
            <div className="flex gap-2 mb-6">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${difficultyColors[clinicalCase.difficulty]}`}>{clinicalCase.difficulty}</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300"><Coin /> +{UA_PER_CASE.toLocaleString('fr-FR')} UA</span>
            </div>

            <p className="text-white/90 text-lg mb-8 leading-relaxed">{clinicalCase.statement}</p>

            {/* Options — coloriage depuis la RÉPONSE serveur */}
            <div className="space-y-3">
              {clinicalCase.options.map((option, index) => {
                let buttonClass = "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ";
                if (isSubmitted && result) {
                  if (option === result.correctAnswer) buttonClass += "border-green-400 bg-green-400/10 text-green-300 font-bold";
                  else if (option === selectedAnswer) buttonClass += "border-red-400 bg-red-400/10 text-red-300";
                  else buttonClass += "border-white/10 text-white/30 opacity-70";
                } else {
                  buttonClass += selectedAnswer === option
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-200 font-bold shadow-lg shadow-yellow-900/30"
                    : "border-white/10 text-white/90 hover:border-yellow-500/50 hover:bg-white/5";
                }
                return (
                  <motion.button
                    key={index}
                    onClick={() => !isSubmitted && setSelectedAnswer(option)}
                    disabled={isSubmitted}
                    whileHover={!isSubmitted ? { scale: 1.02 } : undefined}
                    whileTap={!isSubmitted ? { scale: 0.98 } : undefined}
                    animate={isSubmitted && result && !result.isCorrect && option === selectedAnswer ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                    className={buttonClass}
                  >
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-sm flex-shrink-0 ${selectedAnswer === option && !isSubmitted ? 'bg-yellow-500 text-[#1a1308]' : isSubmitted && result && option === result.correctAnswer ? 'bg-green-400 text-[#0f0a05]' : isSubmitted && result && option === selectedAnswer ? 'bg-red-400 text-white' : 'bg-white/10 text-yellow-200/60'}`}>
                      {letters[index]}
                    </span>
                    <span className="flex-1">{option}</span>
                  </motion.button>
                );
              })}
            </div>

            {!isSubmitted ? (
              <motion.button
                onClick={() => handleSubmit(false)}
                disabled={!selectedAnswer || loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full mt-8 py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#1a1308] text-lg font-extrabold rounded-2xl shadow-lg uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Valider ma réponse
              </motion.button>
            ) : (
              <div className="mt-8">
                {serverError && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-2xl mb-4 bg-red-400/10 border-2 border-red-400/40 text-center">
                    <h3 className="font-extrabold text-xl mb-2 text-red-300">⚠️ Erreur</h3>
                    <p className="text-red-200/80 text-sm mb-4">{serverError}</p>
                    <button onClick={() => window.location.reload()} className="py-3 px-8 bg-yellow-500 text-[#1a1308] font-extrabold rounded-2xl">
                      Réessayer
                    </button>
                  </motion.div>
                )}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    className={`p-6 rounded-2xl mb-4 ${result.isCorrect ? 'bg-green-400/10 border-2 border-green-400/30' : 'bg-red-400/10 border-2 border-red-400/30'}`}
                  >
                    {result.isCorrect && (
                      <div className="h-9 mb-1 flex items-center justify-center overflow-hidden">
                        <span className="text-xl font-extrabold text-yellow-300 animate-coin"><Coin /> +{result.uaEarned.toLocaleString('fr-FR')} UA</span>
                      </div>
                    )}
                    <h3 className={`font-extrabold text-xl mb-2 ${result.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                      {wasViolation ? "🚫 Cas annulé — sortie de l'application" : result.isCorrect ? `🎉 Bonne réponse ! +${result.uaEarned.toLocaleString('fr-FR')} UA` : "❌ Mauvaise réponse"}
                    </h3>
                    <p className="text-yellow-300 text-sm mb-2"><Coin /> Trésor Élite : {result.balanceAfter.toLocaleString('fr-FR')} UA · <span className="inline-block animate-flame">🔥</span> Flamme : {result.streak} jours</p>
                    {result.chestUnlocked && (
                      <p className="text-amber-300 text-sm mb-2 font-bold">🎁 Coffre des 7 jours débloqué !</p>
                    )}
                    {result.newBadges && result.newBadges.length > 0 && (
                      <p className="text-yellow-200/80 text-sm mb-2 font-bold">🏅 {result.newBadges.map(b => `${b.icon} ${b.name}`).join(' · ')}</p>
                    )}
                    <p className="text-white/60 font-semibold mb-2">💡 Explication :</p>
                    <p className="text-white/50 leading-relaxed">{result.explanation}</p>
                  </motion.div>
                )}
                <div className="flex flex-col gap-3">
                  <motion.button
                    onClick={() => router.refresh()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#1a1308] text-lg font-extrabold rounded-2xl shadow-lg uppercase tracking-wide text-center transition-all"
                  >
                    Continuer le défi
                  </motion.button>
                  <button
                    onClick={() => { window.location.href = '/etudiant/monetise'; }}
                    className="w-full py-2 text-white/40 text-sm font-bold hover:text-yellow-300 text-center transition-all"
                  >
                    Retour au tableau de bord
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </CaseGuard>
  );
}