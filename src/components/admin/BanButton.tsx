'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BanButton({ userId, isBanned }: { userId: string, isBanned: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBan = async () => {
    const actionLabel = isBanned ? 'débannir' : 'bannir';
    if (!confirm(`Voulez-vous vraiment ${actionLabel} cet étudiant ?`)) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: isBanned ? 'VALIDE' : 'BANNI' })
      });
      if (!res.ok) {
        setError("Erreur lors de l'action.");
        return;
      }
      router.refresh();
    } catch (e) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleBan}
        disabled={loading}
        className={`adm-btn adm-btn-sm ${isBanned ? 'adm-btn-ghost' : 'adm-btn-danger'}`}
      >
        {loading ? '⏳ Traitement...' : (isBanned ? '✅ Débannir' : '🚫 Bannir')}
      </button>
      {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
    </div>
  );
}