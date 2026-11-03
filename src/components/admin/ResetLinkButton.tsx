'use client';

import { useState } from 'react';

// Crée un lien « nouveau mot de passe » (30 min, usage unique) et l'envoie à l'étudiant sur WhatsApp.
// Sans numéro connu : le lien est copié, à coller où l'on veut.
export default function ResetLinkButton({ userId, phone }: { userId: string; phone?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    // Onglet ouvert tout de suite (sinon le téléphone bloque l'ouverture après l'attente du serveur)
    const tab = phone ? window.open('', '_blank') : null;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      const text = `Bonjour ! Voici ton lien pour choisir un nouveau mot de passe Dr Stone Arena (valable 30 minutes, une seule fois) :\n${data.link}`;
      if (tab) {
        tab.location.href = `https://wa.me/${phone!.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        setMessage('WhatsApp ouvert');
      } else {
        await navigator.clipboard.writeText(text);
        setMessage('Lien copié');
      }
    } catch (e: any) {
      tab?.close();
      setMessage(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleClick} disabled={loading} className="adm-btn adm-btn-ghost adm-btn-sm"
        title="Crée un lien pour que l'étudiant choisisse lui-même son nouveau mot de passe">
        {loading ? '⏳ Lien...' : '🔗 Lien MDP'}
      </button>
      {message && <span className="text-xs font-bold text-emerald-500">{message}</span>}
    </div>
  );
}
