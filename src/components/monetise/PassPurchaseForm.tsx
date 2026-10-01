'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ActiveMethod = {
  id: string; name: string; icon: string | null;
  beneficiaryName: string | null; paymentIdentifier: string | null; instructions: string | null;
};

export default function PassPurchaseForm({ activeMethods, passActive }: {
  activeMethods: ActiveMethod[];
  passActive: boolean;
}) {
  const router = useRouter();
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const method = activeMethods.find(m => m.id === selectedMethodId) ?? null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!method) { setError("Sélectionne d'abord un moyen de paiement."); return; }

    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const file = formData.get('receipt') as File;
    if (!file || file.size === 0) {
      setError('Veuillez sélectionner une image de reçu.');
      setLoading(false);
      return;
    }
    formData.append('paymentMethodId', method.id);

    try {
      const res = await fetch('/api/monetise/pass-request', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi.");
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-400/10 border-2 border-emerald-400/30 p-6 rounded-3xl text-center">
        <p className="font-bold text-emerald-300">✅ Reçu envoyé !</p>
        <p className="text-sm text-white/50 mt-1">L'administrateur validera ton Pass sous peu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <h2 className="font-extrabold text-yellow-300 text-lg">
        {passActive ? "🔄 Renouveler mon Pass (2 000 FCFA)" : "🪙 Activer mon Pass (2 000 FCFA)"}
      </h2>

      {error && <div className="bg-red-400/10 border-2 border-red-400/30 text-red-400 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}

      {activeMethods.length === 0 ? (
        <div className="bg-white/5 border-2 border-dashed border-yellow-500/30 rounded-3xl p-6 text-center">
          <p className="font-bold text-yellow-300">Aucun moyen de paiement disponible actuellement</p>
          <p className="text-sm text-white/40 mt-1">Contacte l'administration pour finaliser ton abonnement.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Choix du moyen */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {activeMethods.map(m => {
              const isSel = selectedMethodId === m.id;
              return (
                <button type="button" key={m.id} onClick={() => setSelectedMethodId(m.id)}
                  className={`bg-white/5 border-2 p-4 rounded-2xl flex items-center gap-3 transition-all ${isSel ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-white/10 hover:border-yellow-500/40'}`}>
                  <span className="text-2xl">{m.icon || '💰'}</span>
                  <span className="font-bold text-yellow-200 text-sm">{m.name}</span>
                </button>
              );
            })}
          </div>

          {/* Instructions + upload */}
          {method && (
            <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-5 text-sm text-blue-200 space-y-2">
              <p className="font-bold text-base">Instructions pour {method.icon} {method.name} :</p>
              <p>1. Envoyez <span className="font-extrabold">2 000 FCFA</span> au numéro <span className="font-extrabold">{method.paymentIdentifier || '—'}</span>{method.beneficiaryName ? ` (${method.beneficiaryName})` : ''}.</p>
              {method.instructions && <p className="text-blue-300/70">{method.instructions}</p>}
              <p className="text-xs text-blue-300/50">2. Prends une photo claire du reçu. 3. Envoie-la ci-dessous.</p>
            </div>
          )}

          {method && (
            <>
              <div>
                <label className="block text-yellow-200/70 text-sm font-bold mb-2">Photo du reçu de paiement</label>
                <input type="file" name="receipt" accept="image/*" required
                  className="w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/20 file:text-yellow-300 hover:file:bg-yellow-500/30" />
              </div>
              <p className="text-center text-xs leading-relaxed text-mute">
                Le Pass Élite donne accès à l'Espace Élite : cas Élite, Rush, boutique, personnalisation et classement. Tu paies un accès, pas une mise. La Prime Arena récompense ton travail et ta performance : elle n'est pas garantie et ne dépend pas de ce que tu paies.
              </p>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-[#1a1308] font-extrabold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50 transition-all">
                {loading ? '⏳ Envoi en cours...' : 'Envoyer ma demande'}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}