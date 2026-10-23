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
        className="adm-btn adm-btn-mala adm-btn-sm"
      >
        {loading ? 'Validation…' : 'Valider le compte'}
      </button>
      {error && <span className="text-xs font-bold text-heart">{error}</span>}
    </div>
  );
}