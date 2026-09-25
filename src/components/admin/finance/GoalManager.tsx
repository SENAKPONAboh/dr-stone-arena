'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GOAL_TYPES } from '@/lib/goal-types';

type GoalWithProgress = {
  id: string;
  type: string;
  target: number;
  period: string;
  current: number | null;
  progressPct: number | null;
};

const inputStyle = "w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-800 text-sm";
const labelStyle = "block text-gray-700 text-xs font-bold mb-1.5";

export default function GoalManager({ goals }: { goals: GoalWithProgress[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const now = new Date();
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yearPeriod = String(now.getFullYear());

  const typeLabel = (v: string) => GOAL_TYPES.find(t => t.value === v)?.label ?? v;
  const typeUnit = (v: string) => GOAL_TYPES.find(t => t.value === v)?.unit ?? '';
  const fmtValue = (v: number) => v >= 1000 ? v.toLocaleString('fr-FR') : String(v);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/financial-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setSuccess('Objectif défini ✅');
        (e.target as HTMLFormElement).reset();
        router.refresh();
        setTimeout(() => setSuccess(''), 2500);
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet objectif ?')) return;
    setDeletingId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/financial-goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
      } else {
        router.refresh();
      }
    } catch (e) {
      setError('Erreur de connexion.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Formulaire */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-extrabold text-gray-800">➕ Définir un objectif</h3>

        {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}
        {success && <div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{success}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelStyle}>Type d'objectif *</label>
            <select name="type" required className={inputStyle}>
              {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelStyle}>Cible *</label>
            <input name="target" type="number" min="1" required placeholder="Ex: 100000" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>Période *</label>
            <select name="period" required className={inputStyle}>
              <option value={monthPeriod}>📅 Ce mois ({monthLabel})</option>
              <option value={yearPeriod}>🗓️ Cette année ({yearPeriod})</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50">
              {loading ? '⏳ Enregistrement...' : '💾 Définir l\'objectif'}
            </button>
          </div>
        </form>
      </div>

      {/* Liste des objectifs */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-extrabold text-gray-800 mb-4">🎯 Objectifs définis ({goals.length})</h3>
        {goals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-2xl">Aucun objectif défini pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {goals.map(g => {
              const unit = typeUnit(g.type);
              const reached = g.progressPct !== null && g.progressPct >= 100;
              return (
                <div key={g.id} className="p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-700 truncate">{typeLabel(g.type)}</p>
                      <p className="text-xs text-gray-400">
                        Période : {g.period} · Cible : {fmtValue(g.target)} {unit}
                        {g.current !== null && ` · Actuel : ${fmtValue(g.current)} ${unit}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {reached && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full font-bold whitespace-nowrap">🏆 Atteint</span>}
                      <button onClick={() => handleDelete(g.id)} disabled={deletingId === g.id}
                        className="text-xs bg-red-50 text-red-500 font-bold py-1.5 px-3 rounded-xl border border-red-100 hover:bg-red-100 transition-all disabled:opacity-50">
                        {deletingId === g.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                  {g.progressPct !== null ? (
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full transition-all ${reached ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                        style={{ width: `${g.progressPct}%` }}></div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Période non active — progression non calculée</p>
                  )}
                  {g.progressPct !== null && (
                    <p className="text-xs text-gray-400 mt-1 font-bold text-right">{g.progressPct}% de la cible</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}