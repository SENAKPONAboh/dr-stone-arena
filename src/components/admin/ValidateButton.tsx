'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ValidateButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleValidate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Erreur lors de la validation.');
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
        onClick={handleValidate}
        disabled={loading}
        className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
      >
        {loading ? '⏳ Validation...' : '✅ Valider'}
      </button>
      {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
    </div>
  );
}