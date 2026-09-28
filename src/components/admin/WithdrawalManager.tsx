'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Withdrawal = {
  id: string; amountUA: number; amountFCFA: number; operator: string;
  phoneNumber: string; accountName: string | null; status: string; note: string | null;
  createdAt: string; processedAt: string | null;
  user: { prenom: string; nom: string; pseudo: string | null; email: string };
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  EN_ATTENTE: { cls: 'bg-yellow-100 text-yellow-700', label: 'À traiter' },
  EN_TRAITEMENT: { cls: 'bg-blue-100 text-blue-700', label: 'En traitement' },
  PAYE: { cls: 'bg-green-100 text-green-700', label: 'Payé' },
  REJETE: { cls: 'bg-red-100 text-red-700', label: 'Rejeté' },
  ANNULE: { cls: 'bg-gray-100 text-gray-500', label: 'Annulé' },
};

export default function WithdrawalManager() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (all: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${all ? 'ALL' : 'PENDING'}`);
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur'); return; }
      setWithdrawals(data.withdrawals ?? []);
      setError('');
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(showAll); }, [showAll, load]);

  const act = async (id: string, action: string) => {
    if (busyId) return;
    let note: string | null = null;
    if (action === 'REJETE') {
      note = prompt("Motif du rejet (optionnel — visible par l'étudiant) :") ?? '';
    }
    if (action === 'PAYE') {
      if (!confirm("Confirmer le PAIEMENT ? Vérifie d'abord que le transfert mobile money a réellement été effectué.")) return;
    }
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action, note }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur'); return; }
      await load(showAll);
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-extrabold text-gray-800 dark:text-white">💰 Retraits UA</h2>
        <button onClick={() => setShowAll(v => !v)}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
          {showAll ? 'À traiter uniquement' : 'Voir tout l\'historique'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm font-bold mb-4 text-center">{error}</p>}
      {loading && <p className="text-gray-400 text-sm text-center py-6">⏳ Chargement…</p>}
      {!loading && withdrawals.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6">Aucune demande {showAll ? '' : 'en attente'} pour le moment.</p>
      )}

      <div className="space-y-3">
        {withdrawals.map(w => {
          const badge = STATUS_BADGE[w.status] ?? { cls: 'bg-gray-100 text-gray-500', label: w.status };
          const actionable = ['EN_ATTENTE', 'EN_TRAITEMENT'].includes(w.status);
          return (
            <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-gray-100 dark:border-slate-600">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white">
                    {w.user.pseudo || `${w.user.prenom} ${w.user.nom}`}
                    <span className="text-xs font-normal text-gray-400 ml-2">{w.user.email}</span>
                  </p>
                  <p className="text-xl font-extrabold text-gray-800 dark:text-white mt-1">
                    {w.amountUA.toLocaleString('fr-FR')} UA → <span className="text-emerald-600 dark:text-emerald-400">{w.amountFCFA.toLocaleString('fr-FR')} FCFA</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {w.operator === 'ORANGE_MONEY' ? '🟠 Orange Money' : '🔵 Moov Money'} · <span className="font-bold">{w.phoneNumber}</span>
                    {w.accountName ? ` · ${w.accountName}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Demandé le {new Date(w.createdAt).toLocaleString('fr-FR')}
                    {w.processedAt ? ` · traité le ${new Date(w.processedAt).toLocaleString('fr-FR')}` : ''}
                  </p>
                  {w.note && <p className="text-xs text-gray-500 mt-1">📝 {w.note}</p>}
                </div>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
              </div>

              {actionable && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {w.status === 'EN_ATTENTE' && (
                    <button onClick={() => act(w.id, 'EN_TRAITEMENT')} disabled={busyId === w.id}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold disabled:opacity-40">
                      ⏳ Marquer en traitement
                    </button>
                  )}
                  <button onClick={() => act(w.id, 'PAYE')} disabled={busyId === w.id}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-40">
                    ✅ Marquer payé
                  </button>
                  <button onClick={() => act(w.id, 'REJETE')} disabled={busyId === w.id}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold disabled:opacity-40">
                    ❌ Rejeter (UA rendues)
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}