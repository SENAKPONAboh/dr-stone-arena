'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ValidateButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      router.refresh(); // Rafraîchit la page pour retirer l'utilisateur de la liste
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleValidate}
      disabled={loading}
      className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
    >
      {loading ? '...' : 'Valider'}
    </button>
  );
}