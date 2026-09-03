'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Invite = { id: string; requesterName: string; requesterImage: string | null; expiresAt: string };

export default function DuelInvitationBanner({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState<string[]>([]);

  const respond = async (duelId: string, accept: boolean) => {
    setLoading(duelId);
    setError('');
    try {
      const res = await fetch('/api/duel/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duelId, accept })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setHidden(prev => [...prev, duelId]);
        router.refresh();
        if (accept) router.push('/etudiant/duel');
      }
    } catch (e) {
      setError('Erreur de connexion');
    } finally {
      setLoading(null);
    }
  };

  const visible = invites.filter(i => !hidden.includes(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map(invite => (
        <div key={invite.id} className="bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚔️</span>
            <div className="flex-1">
              <h3 className="font-extrabold text-lg">{invite.requesterName} te défie en duel !</h3>
              <p className="text-sm text-white/80 mt-1">5 cas cliniques de ton niveau. Acceptes-tu le challenge ? (24h pour répondre)</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => respond(invite.id, true)}
              disabled={loading === invite.id}
              className="flex-1 py-3 bg-white text-red-600 font-extrabold rounded-2xl uppercase tracking-wide text-sm hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              {loading === invite.id ? '...' : '⚔️ Accepter le duel'}
            </button>
            <button
              onClick={() => respond(invite.id, false)}
              disabled={loading === invite.id}
              className="flex-1 py-3 bg-white/20 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm hover:bg-white/30 transition-all disabled:opacity-50"
            >
              Refuser
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-red-500 text-xs text-center bg-white rounded-xl py-2">{error}</p>}
    </div>
  );
}