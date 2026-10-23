'use client';

import { useState } from 'react';
import AdminIcon from './AdminIcon';

// Déconnexion compacte pour l'en-tête du panel (même appel que le bouton de l'espace étudiant).
export default function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      setLoading(false);
    }
  };

  return (
    <button onClick={logout} disabled={loading} className="adm-btn adm-btn-ghost adm-btn-sm" aria-label="Se déconnecter">
      <AdminIcon name="logout" size={18} />
      <span className="hidden sm:inline">{loading ? 'Déconnexion…' : 'Déconnexion'}</span>
    </button>
  );
}
