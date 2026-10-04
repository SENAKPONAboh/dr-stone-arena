'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import CaseGuard from '@/components/ui/CaseGuard';
import AnswerOption, { type AnswerState } from '@/components/ui/AnswerOption';
import ArenaButton from '@/components/ui/ArenaButton';
import TimerRing from '@/components/ui/TimerRing';
import ResultSheet from '@/components/ui/ResultSheet';
import EcgLine from '@/components/ui/EcgLine';
import Icon from '@/components/ui/Icon';
import LastSecondsAlert from '@/components/ui/LastSecondsAlert';
import GradeUpOverlay from '@/components/ui/GradeUpOverlay';
import { getXpGrade, type XpGrade } from '@/lib/grades';

// ⚠️ correctAnswer et explanation ne sont JAMAIS transmis au navigateur avant la réponse :
// le serveur les renvoie dans la réponse de /api/challenge/submit.
type ClinicalCaseProps = {
  caseNumber?: number;
  total?: number;
  clinicalCase: {
    id: string;
    title: string;
    statement: string;
    options: string[];
    durationMax: number;
    xp: number;
    difficulty: string;
    chapter: { name: string; subject: { name: string } };
  };
};

type SubmitResult = {
  isCorrect: boolean;
  xpEarned: number;
  livesLeft?: number;
  xpBefore?: number;
  xpAfter?: number;
  correctAnswer: string;
  explanation: string;
};

export default function ChallengeClient({ clinicalCase, caseNumber, total }: ClinicalCaseProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(clinicalCase.durationMax);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardReady, setGuardReady] = useState(false);
  const [wasViolation, setWasViolation] = useState(false);
  const [gradeUp, setGradeUp] = useState<{ from: XpGrade; to: XpGrade } | null>(null);

  // Chronomètre — démarre SEULEMENT après l'accord de l'avertissement anti-triche
  useEffect(() => {
    if (isSubmitted || !guardReady) return;
    if (timeLeft <= 0) {
      handleSubmit(true); // Temps écoulé = on soumet automatiquement
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
      const res = await fetch('/api/challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalCaseId: clinicalCase.id,
          userAnswer: violation ? "Cas annulé — sortie de l'application" : timeout ? "Aucune réponse (Temps écoulé)" : selectedAnswer,
          timeSpent: timeSpent
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        // Montée de grade : on laisse d'abord apparaître le +XP, puis grande animation plein écran
        if (typeof data.xpBefore === 'number' && typeof data.xpAfter === 'number') {
          const from = getXpGrade(data.xpBefore).current;
          const to = getXpGrade(data.xpAfter).current;
          if (to.index > from.index) setTimeout(() => setGradeUp({ from, to }), 1500);
        }
        if (data.isCorrect) {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#2fd28a', '#e9f1ed', '#5cc8ff'], disableForReducedMotion: true });
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
    FACILE: 'bg-mala/15 text-mala',
    MOYEN: 'bg-flame/15 text-flame',
    DIFFICILE: 'bg-heart/15 text-heart',
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const stateOf = (option: string): AnswerState => {
    if (!isSubmitted) return selectedAnswer === option ? 'selected' : 'idle';
    if (!result) return selectedAnswer === option ? 'selected' : 'dimmed';
    if (option === result.correctAnswer) return 'correct';
    if (option === selectedAnswer) return 'wrong';
    return 'dimmed';
  };

  return (
    <CaseGuard
      armed={guardReady && !isSubmitted}
      onAcknowledge={() => setGuardReady(true)}
      onViolation={() => handleSubmit(false, true)}
      rules={
        <>
          <p>🔒 Si tu quittes cette page (changement d'application, d'onglet, écran d'accueil) pendant le cas → <b>le cas est immédiatement annulé</b>.</p>
          <p>📉 Cas annulé = réponse fausse : <b>0 XP</b> et <b>une vie perdue</b>.</p>
        </>
      }
    >
      <LastSecondsAlert remaining={timeLeft} active={guardReady && !isSubmitted} />
      <div className="relative min-h-[80vh] pb-40">
        <div className="mx-auto max-w-2xl">

          {/* En-tête du défi */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mute">{clinicalCase.chapter.subject.name} • {clinicalCase.chapter.name}</span>
              <h1 className="mt-1 font-display text-lg font-extrabold leading-snug text-ink">{clinicalCase.title}</h1>
            </div>
            <TimerRing remaining={timeLeft} total={clinicalCase.durationMax} />
          </div>

          {/* Progression des 10 cas */}
          {caseNumber && total ? (
            <div className="mb-4">
              <div className="flex gap-1">
                {Array.from({ length: total }, (_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < caseNumber - 1 ? 'bg-mala' : i === caseNumber - 1 ? 'bg-sky' : 'bg-slab-2'}`} />
                ))}
              </div>
              <p className="mt-1.5 text-xs font-bold text-mute">Cas {caseNumber}/{total} du jour</p>
            </div>
          ) : null}

          {/* Énoncé */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="rounded-3xl border border-line bg-slab p-5">
            <div className="mb-4 flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${difficultyColors[clinicalCase.difficulty] ?? 'bg-slab-2 text-mute'}`}>{clinicalCase.difficulty}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-mala/15 px-3 py-1 text-xs font-bold text-mala"><Icon name="star" size={12} /> +{clinicalCase.xp} XP</span>
            </div>
            <p className="whitespace-pre-line font-body text-[16px] leading-relaxed text-ink">{clinicalCase.statement}</p>
          </motion.div>

          {/* Options de réponse (en cascade) */}
          <div className="mt-5 space-y-3">
            {clinicalCase.options.map((option, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.07 }}>
                <AnswerOption
                  letter={letters[index]}
                  state={stateOf(option)}
                  disabled={isSubmitted}
                  onClick={() => setSelectedAnswer(option)}
                >
                  {option}
                </AnswerOption>
              </motion.div>
            ))}
          </div>

          {!isSubmitted && (
            <ArenaButton full className="mt-6" onClick={() => handleSubmit(false)} disabled={!selectedAnswer || loading}>
              Valider ma réponse
            </ArenaButton>
          )}

          {serverError && (
            <div className="mt-6 rounded-2xl border border-heart/40 bg-heart/10 p-4 text-sm text-ink">
              <p className="font-bold text-heart">{serverError}</p>
              <ArenaButton full variant="ghost" className="mt-3" onClick={() => { window.location.href = '/etudiant'; }}>
                Retour à l'accueil
              </ArenaButton>
            </div>
          )}

          {isSubmitted && !result && !serverError && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <EcgLine className="h-8 w-40" />
              <p className="text-xs font-bold text-mute">Analyse de ta réponse…</p>
            </div>
          )}
        </div>
      </div>

      {/* +XP qui s'envole */}
      {result?.isCorrect && (
        <motion.div initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: 0, y: -160, scale: 1.3 }} transition={{ duration: 1.2, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-x-0 top-1/2 z-[95] text-center font-display text-3xl font-extrabold text-mala">
          +{result.xpEarned} XP
        </motion.div>
      )}

      {gradeUp && <GradeUpOverlay from={gradeUp.from} to={gradeUp.to} onClose={() => setGradeUp(null)} />}

      <ResultSheet
        open={!!result}
        correct={!!result?.isCorrect}
        title={wasViolation ? "Cas annulé — sortie de l'application" : result?.isCorrect ? `Diagnostic posé ! +${result.xpEarned} XP` : 'Pas grave, voici le raisonnement'}
        action={
          <div className="space-y-2">
            <ArenaButton full onClick={() => router.refresh()}>Continuer le défi</ArenaButton>
            <button onClick={() => { window.location.href = '/etudiant'; }} className="w-full py-2 text-sm font-bold text-mute">
              Retour à l'accueil
            </button>
          </div>
        }
      >
        <p className="mb-1 font-bold">💡 Explication</p>
        {result?.explanation}
      </ResultSheet>
    </CaseGuard>
  );
}
