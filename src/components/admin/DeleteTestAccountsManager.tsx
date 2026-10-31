'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const CONFIRM_WORD = 'SUPPRIMER';

export type CleanupAccount = {
  id: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  email: string;
  role: string;
  xp: number;
  createdAt: string; // ISO
  protectedReason: 'ADMIN' | 'MOI' | 'RECENT' | null; // jamais supprimable
};

type DeleteResult = {
  users: number; ambassadors: number; attempts: number; duels: number;
  messages: number; receipts: number; withdrawals: number;
};

const REASON_LABEL = { ADMIN: 'ADMIN · toujours gardé', MOI: 'Ton compte · toujours gardé', RECENT: 'Inscrit au lancement · protégé' };

export default function DeleteTestAccountsManager({ accounts }: { accounts: CleanupAccount[] }) {
  const router = useRouter();
  // On retient les comptes DÉCOCHÉS (à supprimer) : tout compte nouveau ou non touché reste gardé.
  const [drop, setDrop] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [armed, setArmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeleteResult | null>(null);

  const deletable = accounts.filter(a => !a.protectedReason);
  const toDelete = deletable.filter(a => drop.has(a.id));
  const kept = accounts.filter(a => a.protectedReason || !drop.has(a.id));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(a =>
      [a.prenom, a.nom, a.pseudo ?? '', a.email].some(v => v.toLowerCase().includes(q)));
  }, [accounts, query]);

  const toggle = (id: string) => {
    setArmed(false);
    setDrop(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const setAll = (value: boolean) => {
    setArmed(false);
    setDrop(value ? new Set() : new Set(deletable.map(a => a.id)));
  };

  const handleDelete = async () => {
    if (confirmText !== CONFIRM_WORD || toDelete.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/delete-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: CONFIRM_WORD, deleteIds: toDelete.map(a => a.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setResult(data.result);
        setArmed(false);
        setConfirmText('');
        setDrop(new Set());
        router.refresh();
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const name = (a: CleanupAccount) => a.pseudo || `${a.prenom} ${a.nom}`;

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}

      {result && (
        <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-3xl space-y-2">
          <p className="font-extrabold text-emerald-700 text-lg">✅ {result.users} compte(s) supprimé(s)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.attempts}</b> tentatives</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.duels}</b> duels</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.messages}</b> messages</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.receipts}</b> reçus</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.withdrawals}</b> retraits</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.ambassadors}</b> ambassadeurs</p>
          </div>
          <p className="text-xs text-emerald-600 text-center">Vérifie dans Gestion des Étudiants : seuls les comptes gardés y apparaissent.</p>
        </div>
      )}

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-gray-800">🧹 Supprimer les comptes de test</h3>
          <p className="text-sm text-gray-500">
            Coche les comptes à <b>garder</b>, décoche ceux à <b>supprimer définitivement</b> (avec leurs cas joués, duels, messages, reçus, UA, retraits et profil ambassadeur).
            Les comptes ADMIN et ceux inscrits à partir du 2 novembre sont toujours protégés.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <p className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><b className="block text-2xl">{kept.length}</b>gardé(s)</p>
          <p className="rounded-2xl bg-red-50 p-3 text-red-600"><b className="block text-2xl">{toDelete.length}</b>à supprimer</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Chercher (pseudo, nom, e-mail)"
            className="min-w-0 flex-1 basis-48 px-4 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-400"
          />
          <button onClick={() => setAll(true)} className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl text-xs uppercase">Tout garder</button>
          <button onClick={() => setAll(false)} className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl text-xs uppercase">Tout décocher</button>
        </div>

        <ul className="max-h-[28rem] overflow-y-auto divide-y divide-gray-100 rounded-2xl border border-gray-100">
          {visible.length === 0 && <li className="p-4 text-center text-sm text-gray-400">Aucun compte trouvé.</li>}
          {visible.map(a => {
            const locked = a.protectedReason !== null;
            const isKept = locked || !drop.has(a.id);
            return (
              <li key={a.id}>
                <label className={`flex items-center gap-3 px-3 py-2.5 ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${isKept ? '' : 'bg-red-50'}`}>
                  <input
                    type="checkbox"
                    checked={isKept}
                    disabled={locked}
                    onChange={() => toggle(a.id)}
                    aria-label={`Garder ${name(a)}`}
                    className="h-5 w-5 flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-bold ${isKept ? 'text-gray-800' : 'text-red-600 line-through'}`}>
                      {name(a)} {a.pseudo && <span className="font-normal text-gray-400">· {a.prenom} {a.nom}</span>}
                    </span>
                    <span className="block truncate text-xs text-gray-400">
                      {a.email} · {new Date(a.createdAt).toLocaleDateString('fr-FR')} · {a.xp} XP
                    </span>
                    {locked && <span className="block text-xs font-bold text-emerald-600">{REASON_LABEL[a.protectedReason!]}</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {!armed ? (
        <button
          onClick={() => setArmed(true)}
          disabled={toDelete.length === 0}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-2xl uppercase tracking-wide shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          🗑️ Supprimer les {toDelete.length} compte(s) décoché(s)
        </button>
      ) : (
        <div className="bg-red-50 border-2 border-red-200 p-5 rounded-3xl space-y-4">
          <p className="font-extrabold text-red-700 text-center">⚠️ DERNIER AVERTISSEMENT — IRRÉVERSIBLE</p>
          <div className="space-y-2 rounded-2xl border-2 border-red-200 bg-white p-4 text-sm">
            <p className="font-bold text-red-700">{toDelete.length} compte(s) supprimé(s) :</p>
            <p className="text-red-600 break-words">{toDelete.map(name).join(', ')}</p>
            <p className="font-bold text-emerald-700 pt-2">{kept.length} compte(s) gardé(s) :</p>
            <p className="text-emerald-700 break-words">{kept.map(name).join(', ')}</p>
          </div>
          <p className="text-sm text-red-600 text-center">
            Pour confirmer, tape le mot <b className="font-mono tracking-widest">{CONFIRM_WORD}</b> :
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Tape SUPPRIMER ici"
            className="w-full px-4 py-4 text-center font-mono text-lg tracking-widest border-2 border-red-300 rounded-2xl focus:outline-none focus:border-red-500 bg-white"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setArmed(false); setConfirmText(''); }}
              disabled={loading}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold rounded-2xl text-sm uppercase disabled:opacity-50">
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== CONFIRM_WORD}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed">
              {loading ? '⏳ Suppression...' : '🔥 Supprimer définitivement'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
