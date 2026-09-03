'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  targetId: string;
  targetName: string;
  sameLevel: boolean;
  myTier: number | null;
  targetPremium: boolean;
};

export default function ChallengeDuelButton({ targetId, targetName, sameLevel, myTier, targetPremium }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const canChallenge = myTier !== null && sameLevel && targetPremium;

  const handleChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponentId: targetId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch (e) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-center">
        <p className="font-bold text-emerald-600">⚔️ Défi envoyé à {targetName} !</p>
        <p className="text-sm text-emerald-500 mt-1">Il a 24h pour accepter.</p>
      </div>
    );
  }

  let disabledReason = '';
  if (myTier === null) disabledReason = "Réservé aux membres Premium";
  else if (!sameLevel) disabledReason = "Niveau différent — duels entre mêmes niveaux uniquement";
  else if (!targetPremium) disabledReason = "Cet étudiant n'a pas accès aux duels";

  return (
    <div>
      <button
        onClick={handleChallenge}
        disabled={!canChallenge || loading}
        className={`w-full py-3 font-extrabold rounded-2xl uppercase tracking-wide text-sm transition-all ${canChallenge ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
      >
        {loading ? 'Envoi...' : '⚔️ Défier en duel'}
      </button>
      {!canChallenge && <p className="text-xs text-center text-gray-400 mt-1">{disabledReason}</p>}
      {error && <p className="text-red-500 text-xs text-center mt-1">{error}</p>}
    </div>
  );
}