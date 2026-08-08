'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    if (!confirm("Voulez-vous vraiment réinitialiser le mot de passe de cet étudiant à 'DrStone2024' ?")) return;
    
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Réinitialisé !');
        setTimeout(() => router.refresh(), 1500);
      } else {
        setMessage('Erreur');
      }
    } catch (e) {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button 
        onClick={handleReset}
        disabled={loading}
        className="text-xs bg-orange-50 text-orange-600 font-bold py-1 px-3 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all disabled:opacity-50"
      >
        {loading ? '...' : '🔑 Reset MDP'}
      </button>
      {message && <span className="text-xs text-emerald-500 font-bold">{message}</span>}
    </div>
  );
}