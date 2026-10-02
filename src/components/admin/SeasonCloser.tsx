'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SeasonCloser({ defaultSeason, playersWithXp }: { defaultSeason: string; playersWithXp: number }) {
  const router = useRouter();
  const [season, setSeason] = useState(defaultSeason);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ players: number; legends: number } | null>(null);

  const close = async () => {
    if (confirm !== 'CLOTURER' || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/close-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season, confirmation: 'CLOTURER' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur'); return; }
      setDone({ players: data.players, legends: data.legends });
      setConfirm('');
      router.refresh();
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-extrabold text-emerald-700">✅ Saison clôturée</p>
        <p className="mt-1 text-sm text-emerald-700">
          {done.players} étudiant{done.players > 1 ? 's' : ''} enregistré{done.players > 1 ? 's' : ''}, dont <b>{done.legends}</b> au grade maximum.
          Les XP sont repartis à zéro et chaque étudiant a reçu une notification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-bold text-gray-700">Mois à clôturer</label>
        <input type="month" value={season} onChange={e => setSeason(e.target.value)}
          className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-800 focus:border-blue-500 focus:outline-none" />
        <p className="mt-1 text-xs text-gray-400">Le mois qui vient de se terminer (proposé automatiquement). Un mois ne peut être clôturé qu'une seule fois.</p>
      </div>

      <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
        <p className="font-bold">Ce qui va se passer :</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Le grade final et le classement de <b>{playersWithXp}</b> étudiant{playersWithXp > 1 ? 's' : ''} sont enregistrés dans leur profil.</li>
          <li>Les <b>XP de tous les étudiants repartent à zéro</b> (c'est irréversible).</li>
          <li>Rien d'autre n'est touché : comptes, Flamme, vies, duels, UA, boutique, badges.</li>
        </ul>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-gray-700">Tape <b>CLOTURER</b> pour confirmer</label>
        <input value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())} placeholder="CLOTURER"
          className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-bold tracking-widest text-gray-800 focus:border-red-400 focus:outline-none" />
      </div>

      {error && <p className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">{error}</p>}

      <button onClick={close} disabled={confirm !== 'CLOTURER' || loading || !season}
        className="w-full rounded-2xl bg-red-600 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
        {loading ? 'Clôture en cours…' : '🏁 Clôturer la saison et remettre les XP à zéro'}
      </button>
    </div>
  );
}
