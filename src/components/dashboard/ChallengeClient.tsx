'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// On définit le type des props que reçoit le composant
type ClinicalCaseProps = {
  clinicalCase: {
    id: string;
    title: string;
    statement: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    durationMax: number;
    xp: number;
    difficulty: string;
    chapter: { name: string; subject: { name: string } };
  };
};

export default function ChallengeClient({ clinicalCase }: ClinicalCaseProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(clinicalCase.durationMax);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; xpEarned: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Chronomètre
  useEffect(() => {
    if (isSubmitted) return;
    if (timeLeft <= 0) {
      handleSubmit(true); // Temps écoulé = on soumet automatiquement
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitted]);

  const handleSubmit = async (timeout = false) => {
    if (!selectedAnswer && !timeout) return;
    setLoading(true);
    setIsSubmitted(true);

    const timeSpent = clinicalCase.durationMax - timeLeft;

    try {
      const res = await fetch('/api/challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalCaseId: clinicalCase.id,
          userAnswer: timeout ? "Aucune réponse (Temps écoulé)" : selectedAnswer,
          timeSpent: timeSpent
        })
      });

      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    FACILE: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    MOYEN: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    DIFFICILE: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
  };

  // Lettres pour les options (A, B, C, D)
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        
        {/* En-tête du défi */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{clinicalCase.chapter.subject.name} • {clinicalCase.chapter.name}</span>
            <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white mt-1">{clinicalCase.title}</h1>
          </div>
          <div className={`px-4 py-2 rounded-xl font-extrabold text-lg ${timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 text-gray-800 dark:text-white'}`}>
            ⏱️ {timeLeft}s
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8 transition-colors duration-300">
          <div className="flex gap-2 mb-6">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${difficultyColors[clinicalCase.difficulty]}`}>{clinicalCase.difficulty}</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">⭐ +{clinicalCase.xp} XP</span>
          </div>

          <p className="text-gray-700 dark:text-gray-200 text-lg mb-8 leading-relaxed">{clinicalCase.statement}</p>

          {/* Options de réponse */}
          <div className="space-y-3">
            {clinicalCase.options.map((option, index) => {
              let buttonClass = "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ";
              
              if (isSubmitted) {
                // Si la correction est affichée
                if (option === clinicalCase.correctAnswer) {
                  buttonClass += "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold";
                } else if (option === selectedAnswer) {
                  buttonClass += "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300";
                } else {
                  buttonClass += "border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 opacity-70";
                }
              } else {
                // Si en cours de jeu
                buttonClass += selectedAnswer === option 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold shadow-md" 
                  : "border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-100 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-700/50";
              }

              return (
                <button
                  key={index}
                  onClick={() => !isSubmitted && setSelectedAnswer(option)}
                  disabled={isSubmitted}
                  className={buttonClass}
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-sm flex-shrink-0 ${selectedAnswer === option && !isSubmitted ? 'bg-blue-500 text-white' : isSubmitted && option === clinicalCase.correctAnswer ? 'bg-green-500 text-white' : isSubmitted && option === selectedAnswer ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-300'}`}>
                    {letters[index]}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Bouton de validation ou Correction */}
          {!isSubmitted ? (
            <button 
              onClick={() => handleSubmit(false)}
              disabled={!selectedAnswer || loading}
              className="w-full mt-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-lg font-extrabold rounded-2xl shadow-md uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Valider ma réponse
            </button>
          ) : (
            <div className="mt-8">
              {result && (
                <div className={`p-6 rounded-2xl mb-4 ${result.isCorrect ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800'}`}>
                  <h3 className={`font-extrabold text-xl mb-2 ${result.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {result.isCorrect ? `🎉 Bonne réponse ! +${result.xpEarned} XP` : "❌ Mauvaise réponse"}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-200 font-semibold mb-2">💡 Explication :</p>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{clinicalCase.explanation}</p>
                </div>
              )}
              <button 
                onClick={() => router.push('/etudiant')}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-extrabold rounded-2xl shadow-md uppercase tracking-wide transition-all"
              >
                Continuer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}