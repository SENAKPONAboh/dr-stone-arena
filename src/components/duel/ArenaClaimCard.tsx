'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ARENA_THRESHOLDS } from '@/lib/duel';

export default function ArenaClaimCard({ pointsArena, claimed }: { pointsArena: number; claimed: number[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleClaim = async (threshold: number) => {
    setLoading(threshold);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/arena/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setMessage(data.message);
        router.refresh();
      }
    } catch (e) {
      setError('Erreur de connexion');
    } finally {
      setLoading(null);
    }
  };

  const nextThreshold = ARENA_THRESHOLDS.find(t => t.threshold > pointsArena);
  const progress = nextThreshold ? Math.min(100, Math.round((pointsArena / nextThreshold.threshold) * 100)) : 100;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-extrabold text-gray-800">🏟️ Points Arena</h3>
        <span className="text-2xl font-extrabold text-purple-600">{pointsArena} pts</span>
      </div>

      {nextThreshold && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div className="bg-gradient-to-r from-purple-400 to-red-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs text-gray-400 mb-4">Encore {nextThreshold.threshold - pointsArena} pts pour débloquer {nextThreshold.xp} XP</p>
        </>
      )}

      <div className="space-y-2">
        {ARENA_THRESHOLDS.map(t => {
          const isClaimed = claimed.includes(t.threshold);
          const isReachable = pointsArena >= t.threshold && !isClaimed;
          return (
            <div key={t.threshold} className={`flex items-center justify-between p-3 rounded-xl ${isReachable ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50'}`}>
              <span className="text-sm font-bold text-gray-700">{t.threshold} pts → ⭐ {t.xp} XP</span>
              {isClaimed ? (
                <span className="text-xs font-bold text-gray-400">✅ Réclamé</span>
              ) : isReachable ? (
                <button
                  onClick={() => handleClaim(t.threshold)}
                  disabled={loading === t.threshold}
                  className="py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs uppercase tracking-wide disabled:opacity-50"
                >
                  {loading === t.threshold ? '...' : '🎁 Réclamer'}
                </button>
              ) : (
                <span className="text-xs font-bold text-gray-300">🔒</span>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
      {message && <p className="text-emerald-500 text-xs text-center mt-2">{message}</p>}
    </div>
  );
}