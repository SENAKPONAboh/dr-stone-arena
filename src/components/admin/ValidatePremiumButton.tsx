'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ValidatePremiumButton({ requestId, userId, action }: { requestId: string, userId: string, action: 'VALIDE' | 'REJETE' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/validate-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId, action })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isAccept = action === 'VALIDE';

  return (
    <button 
      onClick={handleValidate}
      disabled={loading}
      className={`flex-1 py-3 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm transition-all disabled:opacity-50 ${isAccept ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
    >
      {loading ? '...' : (isAccept ? '✅ Valider' : '❌ Rejeter')}
    </button>
  );
}