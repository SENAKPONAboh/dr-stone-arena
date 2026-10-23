'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReceiptImage from '@/components/admin/ReceiptImage';

type Recharge = {
  id: string; amountUA: number; amountFCFA: number; receiptUrl: string; displayUrl?: string | null;
  status: string; note: string | null; createdAt: string; validatedAt: string | null;
  user: { prenom: string; nom: string; pseudo: string | null; email: string };
  paymentMethod: { name: string; icon: string | null } | null;
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  EN_ATTENTE: { cls: 'bg-yellow-100 text-yellow-700', label: 'À valider' },
  VALIDE: { cls: 'bg-green-100 text-green-700', label: 'Validée' },
  REJETE: { cls: 'bg-red-100 text-red-700', label: 'Rejetée' },
};

export default function RechargeManager() {
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (all: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/recharges?status=${all ? 'ALL' : ''}`);
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur'); return; }
      setRecharges(data.recharges ?? []);
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
    if (action === 'VALIDE') {
      const rc = recharges.find(r => r.id === id);
      if (!confirm(`⚠️ VÉRIFIE LE REÇU D'ABORD !\n\nConfirmer le crédit de ${rc?.amountUA.toLocaleString('fr-FR')} UA (${rc?.amountFCFA.toLocaleString('fr-FR')} FCFA payés) sur le compte de ${rc?.user.pseudo || rc?.user.prenom} ?`)) return;
    }
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/recharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechargeId: id, action, note }),
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
    <div className="adm-card p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="adm-title">Recharges UA</h2>
        <button onClick={() => setShowAll(v => !v)}
          className="adm-tab">
          {showAll ? 'À valider uniquement' : 'Voir tout l\'historique'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm font-bold mb-4 text-center">{error}</p>}
      {loading && <p className="text-gray-400 text-sm text-center py-6">⏳ Chargement…</p>}
      {!loading && recharges.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6">Aucune demande {showAll ? '' : 'en attente'} pour le moment.</p>
      )}

      <div className="space-y-3">
        {recharges.map(r => {
          const badge = STATUS_BADGE[r.status] ?? { cls: 'bg-gray-100 text-gray-500', label: r.status };
          const pending = r.status === 'EN_ATTENTE';
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="adm-card-2 p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 dark:text-white">
                    {r.user.pseudo || `${r.user.prenom} ${r.user.nom}`}
                    <span className="text-xs font-normal text-gray-400 ml-2">{r.user.email}</span>
                  </p>
                  <p className="text-xl font-extrabold text-gray-800 dark:text-white mt-1">
                    +{r.amountUA.toLocaleString('fr-FR')} UA <span className="text-sm text-gray-400">({r.amountFCFA.toLocaleString('fr-FR')} FCFA)</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {r.paymentMethod ? `${r.paymentMethod.icon ?? '🏦'} ${r.paymentMethod.name}` : 'Moyen non précisé'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Demandée le {new Date(r.createdAt).toLocaleString('fr-FR')}
                    {r.validatedAt ? ` · traitée le ${new Date(r.validatedAt).toLocaleString('fr-FR')}` : ''}
                  </p>
                  {r.note && <p className="text-xs text-gray-500 mt-1">📝 {r.note}</p>}
                </div>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
              </div>

              {/* 🧾 Reçu — même système que les Pass/Premium (aperçu + clic pour agrandir) */}
              {r.receiptUrl && (
                <div className="mt-4 w-full sm:w-48">
                  {r.displayUrl ? <ReceiptImage src={r.displayUrl} /> : <p className="text-xs text-red-400">Reçu introuvable dans le stockage.</p>}
                </div>
              )}

              {pending && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => act(r.id, 'VALIDE')} disabled={busyId === r.id}
                    className="adm-btn adm-btn-mala adm-btn-sm">
                    Valider (+{r.amountUA.toLocaleString('fr-FR')} UA)
                  </button>
                  <button onClick={() => act(r.id, 'REJETE')} disabled={busyId === r.id}
                    className="adm-btn adm-btn-danger adm-btn-sm">
                    Rejeter
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