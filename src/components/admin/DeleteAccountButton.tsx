'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Suppression définitive d'un compte et de son numéro WhatsApp.
// Confirmation tapée dans la page (pas de fenêtre confirm(), bloquée dans certains navigateurs).
export default function DeleteAccountButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, confirmation: word.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la suppression.');
        return;
      }
      router.refresh();
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="adm-btn adm-btn-sm adm-btn-danger">
        🗑️ Supprimer
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
      <p className="text-xs font-bold text-red-400">
        Supprimer définitivement {name} ? Son numéro WhatsApp, ses cas joués, duels, messages et reçus partent aussi. Tape SUPPRIMER :
      </p>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="SUPPRIMER"
        autoCapitalize="characters"
        className="adm-input text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading || word.trim() !== 'SUPPRIMER'}
          className="adm-btn adm-btn-sm adm-btn-danger disabled:opacity-40"
        >
          {loading ? '⏳ Suppression...' : 'Confirmer'}
        </button>
        <button onClick={() => { setOpen(false); setWord(''); setError(''); }} disabled={loading} className="adm-btn adm-btn-sm adm-btn-ghost">
          Annuler
        </button>
      </div>
      {error && <span className="text-xs font-bold text-red-500">{error}</span>}
    </div>
  );
}
