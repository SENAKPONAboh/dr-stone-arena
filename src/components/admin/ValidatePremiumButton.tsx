'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Les deux décisions (valider / rejeter) dans un seul bloc : un clic verrouille les deux boutons,
// une confirmation est demandée et l'erreur du serveur s'affiche au lieu d'être ignorée.
export default function ValidatePremiumButton({ requestId, userId, name }: { requestId: string; userId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'VALIDE' | 'REJETE' | null>(null);
  const [error, setError] = useState('');

  const decide = async (action: 'VALIDE' | 'REJETE') => {
    if (busy) return;
    const question = action === 'VALIDE'
      ? `Activer le Premium de ${name} ? Vérifie d'abord le reçu.`
      : `Rejeter la demande Premium de ${name} ?`;
    if (!confirm(question)) return;
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/admin/validate-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId, action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Erreur lors du traitement.');
        return;
      }
      router.refresh();
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button onClick={() => decide('VALIDE')} disabled={!!busy} className="adm-btn adm-btn-mala flex-1">
          {busy === 'VALIDE' ? 'Activation…' : 'Activer le Premium'}
        </button>
        <button onClick={() => decide('REJETE')} disabled={!!busy} className="adm-btn adm-btn-danger flex-1">
          {busy === 'REJETE' ? 'Rejet…' : 'Rejeter'}
        </button>
      </div>
      {error && <p className="text-sm font-bold text-heart">{error}</p>}
    </div>
  );
}
