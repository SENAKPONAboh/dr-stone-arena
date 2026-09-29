'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Student = {
  userId: string; name: string; email: string;
  total: number; correct: number; accuracy: number;
  ultraFastCorrect: number; ultraFastRate: number | null; avgTimeRatio: number | null;
  violations: number; rushPerfects: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
  reasons: string[];
};

type Data = {
  periodDays: number;
  summary: { analyzed: number; high: number; medium: number; low: number };
  students: Student[];
};

const LEVEL_BADGE: Record<string, { cls: string; label: string }> = {
  HIGH: { cls: 'bg-red-100 text-red-700 border border-red-300', label: '🔴 Suspect élevé' },
  MEDIUM: { cls: 'bg-orange-100 text-orange-700 border border-orange-300', label: '🟠 À examiner' },
  LOW: { cls: 'bg-yellow-100 text-yellow-700 border border-yellow-300', label: '🟡 À surveiller' },
  OK: { cls: 'bg-green-100 text-green-600', label: '✅ Normal' },
};

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);

export default function SuspectsManager() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/suspects');
      const d = await res.json();
      if (!res.ok) { setError(d?.error || 'Erreur'); return; }
      setData(d);
      setError('');
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const students = (data?.students ?? []).filter(s => !onlyFlagged || s.level !== 'OK');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-extrabold text-gray-800 dark:text-white">🔍 Comportements suspects</h2>
        <button onClick={() => setOnlyFlagged(v => !v)}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
          {onlyFlagged ? 'Voir tous les étudiants' : 'Suspects uniquement'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm font-bold mb-4 text-center">{error}</p>}
      {loading && <p className="text-gray-400 text-sm text-center py-6">⏳ Analyse en cours…</p>}

      {!loading && data && (
        <>
          {/* Résumé */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-700 dark:text-gray-200">{data.summary.analyzed}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">étudiants actifs ({data.periodDays} jours)</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-red-600">{data.summary.high}</p>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mt-1">🔴 suspects élevés</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-orange-600">{data.summary.medium}</p>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mt-1">🟠 à examiner</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-yellow-600">{data.summary.low}</p>
              <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wide mt-1">🟡 à surveiller</p>
            </div>
          </div>

          {students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Aucun {onlyFlagged ? 'comportement suspect détecté' : 'étudiant actif'} sur la période. 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {students.map((s, i) => {
                const badge = LEVEL_BADGE[s.level] ?? LEVEL_BADGE.OK;
                return (
                  <motion.div key={s.userId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.5) }}
                    className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-gray-100 dark:border-slate-600">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                    </div>

                    {/* Raisons */}
                    {s.reasons.length > 0 && (
                      <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mb-3 pl-4 list-disc">
                        {s.reasons.map((r, j) => <li key={j}>{r}</li>)}
                      </ul>
                    )}

                    {/* Métriques */}
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">📊 {s.total} cas</span>
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">🎯 {pct(s.accuracy)} précision</span>
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full">⚡ {s.ultraFastCorrect} ultra-rapides ({pct(s.ultraFastRate)})</span>
                      <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-full">⏱️ {pct(s.avgTimeRatio)} du temps imparti en moyenne</span>
                      {s.violations > 0 && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full">🚫 {s.violations} annulé{ s.violations > 1 ? 's' : ''}</span>
                      )}
                      {s.rushPerfects > 0 && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full">🏆 {s.rushPerfects} Rush parfait{ s.rushPerfects > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-6 text-center leading-relaxed border-t border-gray-100 dark:border-slate-700 pt-4">
            ⚠️ Ces indicateurs détectent des <b>comportements atypiques</b>, pas des preuves de triche.
            Un excellent étudiant peut répondre vite ; c'est la <b>répétition</b> et la <b>combinaison</b> des signaux qui alertent.
            À croiser avec votre jugement avant toute sanction.
          </p>
        </>
      )}
    </div>
  );
}