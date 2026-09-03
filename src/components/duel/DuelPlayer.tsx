'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Case = {
  id: string; title: string; statement: string; options: string[];
  correctAnswer: string; explanation: string; durationMax: number;
  subject: string; chapter: string;
};

export default function DuelPlayer({ duelId, opponentName, cases }: { duelId: string; opponentName: string; cases: Case[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ caseId: string; answer: string }[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cases[0]?.durationMax ?? 60);
  const [totalTime, setTotalTime] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const current = cases[index];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  useEffect(() => {
    if (answered || done) return;
    if (timeLeft <= 0) {
      handleAnswer(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, answered, done]);

  const handleAnswer = (timeout = false) => {
    if (answered) return;
    const answer = timeout ? "Aucune réponse (Temps écoulé)" : selected;
    const isCorrect = !timeout && !!answer && answer.trim().toLowerCase() === current.correctAnswer.trim().toLowerCase();
    setAnswers(prev => [...prev, { caseId: current.id, answer: answer ?? '' }]);
    if (isCorrect) setCorrectCount(c => c + 1);
    setLastCorrect(isCorrect);
    setTotalTime(t => t + (current.durationMax - timeLeft));
    setAnswered(true);
  };

  const nextCase = () => {
    if (index + 1 < cases.length) {
      setIndex(i => i + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(cases[index + 1].durationMax);
    } else {
      submitDuel();
    }
  };

  const submitDuel = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/duel/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duelId, answers, timeSpent: totalTime })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setDone(true);
      }
    } catch (e) {
      setError('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="text-6xl mb-4">⚔️</div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Réponses envoyées !</h2>
          <p className="text-gray-500 mb-2">Score : <span className="font-bold text-emerald-600">{correctCount}/{cases.length}</span> bonnes réponses</p>
          <p className="text-gray-500 mb-6">En attente du résultat contre <span className="font-bold">{opponentName}</span> (ou le calcul final s'il a déjà joué).</p>
          <div className="space-y-3">
            <Link href={`/etudiant/duel/${duelId}`} className="block w-full py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm">Voir le duel</Link>
            <Link href="/etudiant/duel" className="block py-2 text-gray-500 text-sm font-bold hover:text-blue-600">Retour aux duels</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Progression */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Duel contre {opponentName} — Cas {index + 1}/{cases.length}</span>
          <span className="text-xs font-bold text-purple-600">✓ {correctCount} bonnes réponses</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-gradient-to-r from-red-400 to-orange-500 h-2 rounded-full transition-all" style={{ width: `${(index / cases.length) * 100}%` }}></div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{current.subject} • {current.chapter}</span>
              <h1 className="text-2xl font-extrabold text-gray-800 mt-1">{current.title}</h1>
            </div>
            <div className={`px-4 py-2 rounded-xl font-extrabold text-lg ${timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-50 border-2 border-gray-100 text-gray-800'}`}>
              ⏱️ {timeLeft}s
            </div>
          </div>

          <p className="text-gray-700 text-lg mb-8 leading-relaxed">{current.statement}</p>

          <div className="space-y-3">
            {current.options.map((option, i) => {
              let cls = "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ";
              if (answered) {
                if (option === current.correctAnswer) cls += "border-green-500 bg-green-50 text-green-700 font-bold";
                else if (option === selected) cls += "border-red-500 bg-red-50 text-red-700";
                else cls += "border-gray-200 text-gray-400 opacity-70";
              } else {
                cls += selected === option ? "border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-md" : "border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-gray-50";
              }
              return (
                <button key={i} onClick={() => !answered && setSelected(option)} disabled={answered} className={cls}>
                  <span className="w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-sm flex-shrink-0 bg-gray-100 text-gray-500">{letters[i]}</span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          {!answered ? (
            <button
              onClick={() => handleAnswer(false)}
              disabled={!selected}
              className="w-full mt-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-lg font-extrabold rounded-2xl shadow-md uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Valider ma réponse
            </button>
          ) : (
            <div className="mt-8">
              <div className={`p-5 rounded-2xl mb-4 ${lastCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <p className={`font-extrabold mb-2 ${lastCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {lastCorrect ? '🎉 Bonne réponse !' : '❌ Mauvaise réponse'}
                </p>
                <p className="text-gray-600 leading-relaxed text-sm">💡 {current.explanation}</p>
              </div>
              <button
                onClick={nextCase}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-lg font-extrabold rounded-2xl shadow-md uppercase tracking-wide disabled:opacity-50 transition-all"
              >
                {submitting ? 'Envoi...' : (index + 1 < cases.length ? 'Cas suivant →' : '⚔️ Terminer le duel')}
              </button>
            </div>
          )}
          {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}