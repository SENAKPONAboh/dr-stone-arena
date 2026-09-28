'use client';

import { useState } from 'react';

export default function UaCorrectionManager() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    const amountNum = parseInt(amount || '0', 10) || 0;
    if (!email.trim()) { setError('Email requis.'); return; }
    if (!Number.isInteger(amountNum) || amountNum === 0) { setError('Montant invalide (entier non nul — négatif pour retirer).'); return; }
    if (!note.trim()) { setError('Motif obligatoire.'); return; }
    if (!confirm(`Confirmer : ${amountNum > 0 ? 'créditer' : 'retirer'} ${Math.abs(amountNum).toLocaleString('fr-FR')} UA sur le compte ${email} ?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/ua-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), amountUA: amountNum, note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur'); return; }
      setSuccess(`✅ ${data.userName} : ${data.applied > 0 ? '+' : ''}${data.applied.toLocaleString('fr-FR')} UA — nouveau solde ${data.balanceAfter.toLocaleString('fr-FR')} UA. Transaction ADMIN_CORRECTION enregistrée.`);
      setEmail(''); setAmount(''); setNote('');
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <h2 className="font-extrabold text-gray-800 dark:text-white mb-1">🛠️ Correction de solde UA</h2>
      <p className="text-xs text-gray-400 mb-4">Créditer (+) ou retirer (−) des UA sur n'importe quel compte. Motif obligatoire — tout est inscrit au registre et l'utilisateur est notifié.</p>

      {error && <p className="text-red-500 text-sm font-bold mb-4 text-center">{error}</p>}
      {success && <p className="text-emerald-600 text-sm font-bold mb-4 text-center">{success}</p>}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Email du compte</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="etudiant@email.com"
            className="w-full mt-1 bg-gray-50 dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-800 dark:text-white font-bold focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Montant en UA (négatif = retrait)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex : 1000000 ou -50000"
            className="w-full mt-1 bg-gray-50 dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-800 dark:text-white font-bold focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Motif (obligatoire)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : Recharge test / Compensation événement"
            className="w-full mt-1 bg-gray-50 dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-800 dark:text-white font-bold focus:border-blue-400 outline-none" />
        </div>
        <button onClick={submit} disabled={loading}
          className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide disabled:opacity-40">
          {loading ? '⏳ Application…' : '🛠️ Appliquer la correction'}
        </button>
      </div>
    </div>
  );
}