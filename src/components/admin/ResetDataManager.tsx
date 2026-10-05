'use client';

import { useState } from 'react';

const CONFIRM_WORD = 'RESET';

type ResetResult = {
  attempts: number; badges: number; duels: number; premiumRequests: number;
  notifications: number; expenses: number; goals: number; commissions: number;
  payouts: number; arenaClaims: number; dailySelections: number; studentsReset: number;
};

export default function ResetDataManager() {
  const [armed, setArmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ResetResult | null>(null);
  const [deleteBank, setDeleteBank] = useState(false);
  const [deleteSubjects, setDeleteSubjects] = useState(false);
  const [bank, setBank] = useState<{ cases: number; subjects: number; tournaments: number } | null>(null);

  const handleReset = async () => {
    if (confirmText !== CONFIRM_WORD) return;
    setLoading(true);
    setError('');
    setResult(null);
    setBank(null);
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: CONFIRM_WORD, deleteCaseBank: deleteBank, deleteSubjects: deleteBank && deleteSubjects }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setResult(data.result);
        setBank(data.bank ?? null);
        setDeleteBank(false); setDeleteSubjects(false);
        setArmed(false);
        setConfirmText('');
      }
    } catch (e) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}

      {/* Résultat */}
      {result && (
        <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-3xl space-y-2">
          <p className="font-extrabold text-emerald-700 text-lg">✅ Initialisation terminée</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.studentsReset}</b> comptes remis à zéro</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.attempts}</b> tentatives supprimées</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.badges}</b> badges supprimés</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.duels}</b> duels supprimés</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.premiumRequests}</b> demandes Premium</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.commissions}</b> commissions</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.notifications}</b> notifications</p>
            <p className="bg-white p-2 rounded-xl text-center"><b>{result.expenses}</b> dépenses</p>
          </div>
          {bank ? (
            <p className="text-sm font-bold text-red-600 text-center">🗑️ Banque supprimée : {bank.cases} cas cliniques{bank.subjects > 0 ? `, ${bank.subjects} matières (et leurs chapitres)` : ''}{bank.tournaments > 0 ? `, ${bank.tournaments} tournois` : ''}. Tu peux importer la nouvelle banque.</p>
          ) : (
            <p className="text-xs text-emerald-600 text-center">Les cas cliniques, matières, chapitres, comptes et ambassadeurs sont intacts.</p>
          )}
        </div>
      )}

      {/* Aperçu */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-extrabold text-gray-800">📋 Ce qui sera réinitialisé</h3>
        <ul className="text-sm text-gray-500 space-y-1.5 list-disc list-inside">
          <li>XP, grades, streaks, vies (→10), coffres, badges, onboarding</li>
          <li>Tentatives de cas, sélections quotidiennes, statistiques</li>
          <li>Duels, Points Arena, demandes Premium, statuts Premium, commissions ambassadeurs, attributions</li>
          <li>Notifications, dépenses et objectifs financiers</li>
        </ul>
        <h3 className="font-extrabold text-emerald-600">✅ Ce qui sera conservé</h3>
        <ul className="text-sm text-emerald-600 space-y-1.5 list-disc list-inside">
          <li><b>Les cas cliniques (la banque), matières et chapitres</b></li>
          <li>Les comptes (emails, mots de passe) — remis à zéro, non supprimés</li>
          <li>Profils ambassadeurs (codes), moyens de paiement, comptes ADMIN</li>
        </ul>
      </div>

      {/* Procédure */}
      {!armed ? (
        <button
          onClick={() => setArmed(true)}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-2xl uppercase tracking-wide shadow-md transition-all">
          ⚠️ Initialiser toutes les données (lancement officiel)
        </button>
      ) : (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl space-y-4">
          <p className="font-extrabold text-red-700 text-center">
            ⚠️ DERNIER AVERTISSEMENT — cette action est IRRÉVERSIBLE
          </p>
          <p className="text-sm text-red-600 text-center">
            Pour confirmer, tape le mot <b className="font-mono tracking-widest">{CONFIRM_WORD}</b> en toutes lettres :
          </p>
          <div className="space-y-2 rounded-2xl border-2 border-red-200 bg-white p-4">
            <label className="flex items-start gap-3 text-sm font-bold text-red-700">
              <input type="checkbox" checked={deleteBank} onChange={e => { setDeleteBank(e.target.checked); if (!e.target.checked) setDeleteSubjects(false); }} className="mt-1 h-5 w-5" />
              <span>Supprimer AUSSI toute la banque de cas cliniques<span className="block text-xs font-normal text-red-500">Tous les cas sont effacés, ainsi que les tentatives et tournois liés. À cocher le jour où tu importes la nouvelle banque.</span></span>
            </label>
            {deleteBank && (
              <label className="flex items-start gap-3 pl-1 text-sm font-bold text-red-700">
                <input type="checkbox" checked={deleteSubjects} onChange={e => setDeleteSubjects(e.target.checked)} className="mt-1 h-5 w-5" />
                <span>Supprimer aussi les matières et chapitres<span className="block text-xs font-normal text-red-500">Sinon ils sont gardés et tu les réutilises à l'import.</span></span>
              </label>
            )}
          </div>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Tape RESET ici"
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
              onClick={handleReset}
              disabled={loading || confirmText !== CONFIRM_WORD}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed">
              {loading ? '⏳ Initialisation...' : deleteBank ? '🔥 RESET + SUPPRIMER LA BANQUE' : '🔥 CONFIRMER LE RESET'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}