'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/components/ui/PasswordInput';

const INPUT = 'w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 focus:border-emerald-500 focus:outline-none';

// Écran d'accès au panel ambassadeur : choisir son mot de passe (1re fois) ou le saisir.
export default function AmbassadorGate({ mode }: { mode: 'setup' | 'unlock' }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'setup' && pw !== pw2) { setError('Les deux mots de passe ne sont pas identiques.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ambassadeur/acces', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode === 'setup' ? 'set' : 'unlock', password: pw }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erreur');
      else router.refresh();
    } catch { setError('Erreur de connexion.'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="text-center">
        <p className="text-4xl">{mode === 'setup' ? '🔐' : '🔒'}</p>
        <h2 className="mt-2 text-lg font-extrabold text-gray-800">
          {mode === 'setup' ? 'Choisis ton mot de passe ambassadeur' : 'Panel protégé'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'setup'
            ? 'Ce mot de passe protège ton espace (codes, commissions, filleuls). Tu devras le saisir pour y entrer. Il est différent de celui de ton compte si tu veux.'
            : 'Saisis le mot de passe que tu as choisi pour ton espace ambassadeur.'}
        </p>
      </div>
      <PasswordInput value={pw} onChange={e => setPw(e.target.value)} required minLength={mode === 'setup' ? 6 : undefined} autoFocus
        placeholder={mode === 'setup' ? '6 caractères minimum' : 'Mot de passe du panel'} className={INPUT} autoComplete="off" />
      {mode === 'setup' && (
        <PasswordInput value={pw2} onChange={e => setPw2(e.target.value)} required placeholder="Confirme le mot de passe" className={INPUT} autoComplete="off" />
      )}
      {error && <p className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={loading || !pw}
        className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white disabled:opacity-40">
        {loading ? '…' : mode === 'setup' ? 'Enregistrer et entrer' : 'Entrer'}
      </button>
      {mode === 'unlock' && <p className="text-center text-xs text-gray-400">Mot de passe oublié ? Demande à l'administrateur de le réinitialiser.</p>}
    </form>
  );
}
