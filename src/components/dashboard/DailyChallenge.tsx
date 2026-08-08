'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DailyChallenge({ attemptsToday, claimed }: { attemptsToday: number, claimed: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goal = 2; // Objectif : 2 cas par jour
  const progress = Math.min(attemptsToday, goal);
  const isComplete = progress >= goal;

  const handleClaim = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/challenge/claim-daily', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-extrabold text-gray-800">🎯 Défi du Jour</h3>
        <span className="text-xs font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-full">+20 XP</span>
      </div>
      
      <p className="text-gray-500 text-sm mb-4">Résous <span className="font-bold text-gray-700">{goal} cas cliniques</span> aujourd'hui.</p>
      
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-3 rounded-full transition-all" style={{ width: `${(progress / goal) * 100}%` }}></div>
      </div>

      {claimed ? (
        <div className="bg-emerald-50 text-emerald-600 font-bold text-sm text-center py-3 rounded-xl border border-emerald-100">
          ✅ Défi terminé ! Reviens demain.
        </div>
      ) : isComplete ? (
        <button 
          onClick={handleClaim}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-extrabold rounded-xl shadow-md hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {loading ? 'Réclamation...' : '🎁 Réclamer 20 XP'}
        </button>
      ) : (
        <div className="bg-gray-50 text-gray-500 font-bold text-sm text-center py-3 rounded-xl">
          Progression : {progress} / {goal}
        </div>
      )}

      {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
    </div>
  );
}