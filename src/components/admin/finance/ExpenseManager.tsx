'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  vendor: string | null;
  spentAt: Date;
};

const inputStyle = "w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-800 text-sm";
const labelStyle = "block text-gray-700 text-xs font-bold mb-1.5";

export default function ExpenseManager({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const catLabel = (value: string) => EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? value;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        setSuccess('Dépense enregistrée ✅');
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
    if (!confirm('Supprimer cette dépense ?')) return;
    setDeletingId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/expenses', {
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
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">

      <h3 className="font-extrabold text-gray-800">➕ Enregistrer une dépense</h3>

      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}
      {success && <div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{success}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelStyle}>Montant (FCFA) *</label>
          <input name="amount" type="number" min="1" required placeholder="Ex: 5000" className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Catégorie *</label>
          <select name="category" required className={inputStyle}>
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelStyle}>Date de la dépense *</label>
          <input name="spentAt" type="date" required defaultValue={today} className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Fournisseur</label>
          <input name="vendor" placeholder="Ex: Vercel, Supabase..." className={inputStyle} />
        </div>
        <div className="md:col-span-2">
          <label className={labelStyle}>Description</label>
          <input name="description" placeholder="Ex: Abonnement serveur mensuel" className={inputStyle} />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50">
            {loading ? '⏳ Enregistrement...' : '💾 Enregistrer la dépense'}
          </button>
        </div>
      </form>

      <div>
        <h3 className="font-extrabold text-gray-800 mb-4">📋 Dépenses enregistrées ({expenses.length})</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-2xl">Aucune dépense enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-700 truncate">
                    {catLabel(e.category)} — <span className="text-red-500">{e.amount.toLocaleString('fr-FR')} FCFA</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {new Date(e.spentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {e.vendor ? ` · ${e.vendor}` : ''}
                    {e.description ? ` · ${e.description}` : ''}
                  </p>
                </div>
                <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}
                  className="text-xs bg-red-50 text-red-500 font-bold py-1.5 px-3 rounded-xl border border-red-100 hover:bg-red-100 transition-all disabled:opacity-50 flex-shrink-0">
                  {deletingId === e.id ? '⏳' : '🗑️'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}