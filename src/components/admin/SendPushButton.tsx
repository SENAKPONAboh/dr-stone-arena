'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminIcon from './ui/AdminIcon';

export default function SendPushButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const handleSend = async () => {
    const title = prompt("Titre de la notification :", "🧠 Nouveau Cas Clinique !");
    if (!title) return;
    const body = prompt("Message de la notification :", "Un nouveau défi t'attend dans l'arène. Clique pour le résoudre !");
    if (!body) return;

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body })
      });
      const data = await res.json().catch(() => null);
      setFailed(!res.ok);
      setMessage(res.ok ? data?.message || 'Notification envoyée.' : data?.error || "Erreur lors de l'envoi.");
      if (res.ok) router.refresh();
    } catch {
      setFailed(true);
      setMessage('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button onClick={handleSend} disabled={loading} className="adm-btn adm-btn-sky adm-btn-sm">
        <AdminIcon name="megaphone" size={18} />
        {loading ? 'Envoi en cours…' : 'Envoyer une annonce'}
      </button>
      {message && <span className={`text-xs font-bold ${failed ? 'text-heart' : 'text-mala'}`}>{message}</span>}
    </div>
  );
}
