'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BanButton({ userId, isBanned }: { userId: string, isBanned: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBan = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: isBanned ? 'VALIDE' : 'BANNI' })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleBan}
      disabled={loading}
      className={`text-xs font-bold py-1 px-3 rounded-lg border transition-all disabled:opacity-50 ${isBanned ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
    >
      {loading ? '...' : (isBanned ? '✅ Débannir' : '🚫 Bannir')}
    </button>
  );
}