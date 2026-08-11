'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SendPushButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        router.refresh();
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
    <div className="flex flex-col items-center gap-2">
      <button 
        onClick={handleSend}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-3 px-6 rounded-2xl shadow-md transition-all disabled:opacity-50"
      >
        {loading ? 'Envoi en cours...' : '📢 Envoyer une notification Push'}
      </button>
      {message && <span className="text-xs text-emerald-500 font-bold">{message}</span>}
    </div>
  );
}