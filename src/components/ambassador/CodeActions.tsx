'use client';

import { useState } from 'react';

export default function CodeActions({ code }: { code: string }) {
  const [feedback, setFeedback] = useState('');

  const buildMessage = () =>
    `Rejoins Dr. Stone Arena 🧠⚔️, la plateforme qui transforme la médecine en arène ! Inscris-toi ici : ${window.location.origin}/register avec mon code ambassadeur : ${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildMessage());
      setFeedback('Message copié ! Colle-le où tu veux ✅');
    } catch (e) {
      setFeedback('Copie impossible — sélectionne le code manuellement.');
    }
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dr. Stone Arena', text: buildMessage() });
        setFeedback('Partage lancé ✅');
      } catch (e) {
        // Partage annulé par l'utilisateur — rien à faire
      }
    } else {
      await handleCopy();
    }
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setFeedback('Code copié ✅');
    } catch (e) {
      setFeedback('Copie impossible.');
    }
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={handleCopyCode}
          className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-2xl uppercase tracking-wide text-xs transition-all">
          📋 Copier le code
        </button>
        <button onClick={handleCopy}
          className="py-3 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-xs transition-all">
          💬 Copier le message complet
        </button>
        <button onClick={handleShare}
          className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-xs transition-all">
          📤 Partager (WhatsApp...)
        </button>
      </div>
      {feedback && <p className="text-sm font-bold text-emerald-600 text-center">{feedback}</p>}
    </div>
  );
}