'use client';

import { useState, useEffect } from 'react';

type ClinicalCaseProps = {
  progressLabel: string;
  clinicalCase: {
    id: string; title: string; statement: string; options: string[];
    correctAnswer: string; explanation: string; durationMax: number;
    difficulty: string; subject: string; chapter: string;
  };
};

export default function MonetisePlayClient({ clinicalCase, progressLabel }: ClinicalCaseProps) {
  const [timeLeft, setTimeLeft] = useState(clinicalCase.durationMax);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; uaEarned: number; balanceAfter: number; streak: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const difficultyColors: Record<string, string> = {
    FACILE: 'bg-green-400/20 text-green-300',
    MOYEN: 'bg-orange-400/20 text-orange-300',
    DIFFICILE: 'bg-red-400/20 text-red-300',
  };

  useEffect(() => {
    if (isSubmitted) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitted]);

  const handleSubmit = async (timeout = false) => {
    if (!selectedAnswer && !timeout) return;
    setLoading(true);
    setIsSubmitted(true);
    const timeSpent = clinicalCase.durationMax - timeLeft;

    try {
      const res = await fetch('/api/monetise/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalCaseId: clinicalCase.id,
          userAnswer: timeout ? "Aucune réponse (Temps écoulé)" : selectedAnswer,
          timeSpent,
        }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a05] via-[#1a1308] to-[#0f0a05] py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-xs font-bold text-yellow-200/50 uppercase tracking-wider">{clinicalCase.subject} • {clinicalCase.chapter}</span>
            <h1 className="text-2xl font-extrabold text-white mt-1">{clinicalCase.title}</h1>
            <span className="inline-block mt-2 text-xs font-extrabold bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">{progressLabel}</span>
          </div>
          <div className={`px-4 py-2 rounded-xl font-extrabold text-lg ${timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 border-2 border-yellow-500/30 text-yellow-300'}`}>
            ⏱️ {timeLeft}s
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur rounded-3xl border border-yellow-500/20 p-6 md:p-8">
          <div className="flex gap-2 mb-6">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${difficultyColors[clinicalCase.difficulty]}`}>{clinicalCase.difficulty}</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300">🪙 +1 000 UA</span>
          </div>

          <p className="text-white/90 text-lg mb-8 leading-relaxed">{clinicalCase.statement}</p>

          {/* Options */}
          <div className="space-y-3">
            {clinicalCase.options.map((option, index) => {
              let buttonClass = "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ";
              if (isSubmitted) {
                if (option === clinicalCase.correctAnswer) buttonClass += "border-green-400 bg-green-400/10 text-green-300 font-bold";
                else if (option === selectedAnswer) buttonClass += "border-red-400 bg-red-400/10 text-red-300";
                else buttonClass += "border-white/10 text-white/30 opacity-70";
              } else {
                buttonClass += selectedAnswer === option
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-200 font-bold shadow-lg shadow-yellow-900/30"
                  : "border-white/10 text-white/90 hover:border-yellow-500/50 hover:bg-white/5";
              }
              return (
                <button key={index} onClick={() => !isSubmitted && setSelectedAnswer(option)} disabled={isSubmitted} className={buttonClass}>
                  <span className="w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-sm flex-shrink-0 bg-white/10 text-yellow-200/60">{letters[index]}</span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          {!isSubmitted ? (
            <button onClick={() => handleSubmit(false)} disabled={!selectedAnswer || loading}
              className="w-full mt-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-[#1a1308] text-lg font-extrabold rounded-2xl shadow-lg uppercase tracking-wide disabled:opacity-50 transition-all">
              Valider ma réponse
            </button>
          ) : (
            <div className="mt-8">
              {result && (
                <div className={`p-6 rounded-2xl mb-4 ${result.isCorrect ? 'bg-green-400/10 border-2 border-green-400/30' : 'bg-red-400/10 border-2 border-red-400/30'}`}>
                  <h3 className={`font-extrabold text-xl mb-2 ${result.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                    {result.isCorrect ? `🎉 Bonne réponse ! +${result.uaEarned} UA` : "❌ Mauvaise réponse"}
                  </h3>
                  <p className="text-yellow-300 text-sm mb-2">🪙 Cagnotte : {result.balanceAfter.toLocaleString('fr-FR')} UA · 🔥 Flamme : {result.streak} jours</p>
                  <p className="text-white/60 font-semibold mb-2">💡 Explication :</p>
                  <p className="text-white/50 leading-relaxed">{clinicalCase.explanation}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <a href="/etudiant/monetise/jouer" className="block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-[#1a1308] font-extrabold rounded-2xl shadow-lg uppercase tracking-wide text-center transition-all">
                  Cas suivant →
                </a>
                <a href="/etudiant/monetise" className="block py-2 text-white/40 text-sm font-bold hover:text-yellow-300 text-center">
                  Retour au dashboard
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}