'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PaymentMethod = {
  id: string; name: string; isActive: boolean; isManual: boolean;
  beneficiaryName: string | null; paymentIdentifier: string | null;
  instructions: string | null; icon: string | null;
  displayOrder: number; provider: string | null;
};

export default function PaymentMethodManager({ initialMethods }: { initialMethods: PaymentMethod[] }) {
  const router = useRouter();
  const [methods, setMethods] = useState(initialMethods);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // ===== Feedback immédiat + anti-double-clic =====
  const flash = (msg: string) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 2500);
  };

  const callApi = async (method: string, body: any, id?: string) => {
    const res = await fetch('/api/admin/payment-methods', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    return data;
  };

  const handleToggle = async (m: PaymentMethod) => {
    setLoadingId(m.id); setError('');
    try {
      const data = await callApi('PUT', { id: m.id, isActive: !m.isActive });
      setMethods(prev => prev.map(x => x.id === m.id ? data.method : x));
      flash(data.method.isActive ? `${m.name} activé ✅` : `${m.name} désactivé`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>, m: PaymentMethod) => {
    e.preventDefault();
    setLoadingId(m.id); setError('');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    body.id = m.id;
    try {
      const data = await callApi('PUT', body);
      setMethods(prev => prev.map(x => x.id === m.id ? data.method : x));
      flash(`${m.name} sauvegardé ✅`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingId('new'); setError('');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    try {
      await callApi('POST', body);
      setShowCreate(false);
      flash('Moyen de paiement créé ✅');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-800 text-sm";
  const labelStyle = "block text-gray-700 text-xs font-bold mb-1.5";

  const createForm = (
    <form onSubmit={handleCreate} className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-300 space-y-4">
      <h3 className="font-bold text-gray-800">➕ Nouveau moyen de paiement</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelStyle}>Nom *</label>
          <input name="name" required placeholder="Ex: Orange Money" className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Icône (emoji)</label>
          <input name="icon" placeholder="🟠" className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Ordre d'affichage</label>
          <input name="displayOrder" type="number" defaultValue={99} className={inputStyle} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelStyle}>Bénéficiaire</label>
          <input name="beneficiaryName" placeholder="Ex: Arthur ABOH" className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Numéro / identifiant</label>
          <input name="paymentIdentifier" placeholder="Ex: +227 90 00 00 00" className={inputStyle} />
        </div>
      </div>
      <div>
        <label className={labelStyle}>Instructions affichées à l'étudiant</label>
        <textarea name="instructions" rows={2} placeholder="Ex: Effectuez le paiement sur ce numéro, puis téléversez une photo claire de votre reçu." className={inputStyle} />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loadingId === 'new'} className="py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-50">
          {loadingId === 'new' ? 'Création...' : 'Créer'}
        </button>
        <button type="button" onClick={() => setShowCreate(false)} className="py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold rounded-2xl text-sm">
          Annuler
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">

      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}
      {success && <div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{success}</div>}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Les moyens désactivés ne sont pas proposés aux étudiants.</p>
        <button onClick={() => setShowCreate(s => !s)} className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wide">
          {showCreate ? 'Fermer' : '➕ Ajouter un moyen'}
        </button>
      </div>

      {showCreate && createForm}

      {methods.length === 0 && (
        <p className="text-center text-gray-400 py-8 bg-gray-50 rounded-2xl">Aucun moyen de paiement configuré.</p>
      )}

      {methods.map(m => {
        const busy = loadingId === m.id;
        return (
          <form key={m.id} onSubmit={(e) => handleSave(e, m)} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">

            {/* En-tête : statut + toggle */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m.icon || '💰'}</span>
                <div>
                  <p className="font-extrabold text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-400">
                    {m.isManual ? 'Paiement local manuel (avec reçu)' : 'Automatisé (carte bancaire)'}{m.provider ? ` · Prestataire : ${m.provider}` : ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => handleToggle(m)} disabled={busy}
                className={`py-2 px-4 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 ${m.isActive ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-500'}`}>
                {busy ? '...' : m.isActive ? '✅ Activé' : '⚪ Désactivé'}
              </button>
            </div>

            {m.isActive && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold px-3 py-2 rounded-xl">
                Visible par les étudiants sur la page Premium
              </div>
            )}

            {/* Champs éditables */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>Bénéficiaire</label>
                <input name="beneficiaryName" defaultValue={m.beneficiaryName || ''} placeholder="Nom du bénéficiaire" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Numéro / identifiant</label>
                <input name="paymentIdentifier" defaultValue={m.paymentIdentifier || ''} placeholder="Ex: +227 90 00 00 00" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Ordre d'affichage</label>
                <input name="displayOrder" type="number" defaultValue={m.displayOrder} className={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Icône (emoji)</label>
                <input name="icon" defaultValue={m.icon || ''} placeholder="🌊" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Prestataire (automatisé uniquement)</label>
                <input name="provider" defaultValue={m.provider || ''} placeholder="Ex: cinetpay, stripe — laisser vide pour les moyens manuels" className={inputStyle} disabled={m.isManual} />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Instructions affichées à l'étudiant</label>
              <textarea name="instructions" rows={2} defaultValue={m.instructions || ''} placeholder="Instructions de paiement..." className={inputStyle} />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={busy}
                className="py-3 px-8 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-50">
                {busy ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>
          </form>
        );
      })}
    </div>
  );
}