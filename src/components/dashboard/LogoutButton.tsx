'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // On utilise window.location pour forcer le navigateur à tout oublier
      window.location.href = '/login'; 
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className="w-full py-3 mt-6 bg-red-50 text-red-600 font-bold rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all uppercase tracking-wide text-sm"
    >
      {loading ? 'Déconnexion...' : 'Se déconnecter'}
    </button>
  );
}