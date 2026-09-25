'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AmbassadorStats = {
  users: number; premium: number; caGenere: number;
  commissionTotal: number; commissionPending: number; commissionPaid: number;
};

type AmbassadorItem = {
  id: string; referralCode: string; status: string; commissionRate: number;
  user: { id: string; prenom: string; nom: string; email: string; pays: string | null; universite: string | null };
  stats: AmbassadorStats;
};

type Student = { id: string; prenom: string; nom: string; email: string };

const inputStyle = "w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-800 text-sm";
const labelStyle = "block text-gray-700 text-xs font-bold mb-1.5";

export default function AmbassadorManager({ ambassadors, students }: { ambassadors: AmbassadorItem[]; students: Student[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const flash = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError('');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    try {
      const res = await fetch('/api/admin/ambassadors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erreur');
      else {
        flash(`Ambassadeur créé ✅ Code : ${data.ambassador?.referralCode}`);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch { setError('Erreur de connexion.'); }
    finally { setLoading(false); }
  };

  const updateAmbassador = async (payload: any) => {
    const res = await fetch('/api/admin/ambassadors', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    return data;
  };

  const handleStatus = async (a: AmbassadorItem, newStatus: string) => {
    const labels: Record<string, string> = { ACTIF: 'valider', SUSPENDU: 'suspendre', EN_ATTENTE: 'remettre en attente' };
    if (!confirm(`Voulez-vous vraiment ${labels[newStatus] ?? newStatus} ${a.user.prenom} ${a.user.nom} ?`)) return;
    setBusyId(a.id); setError('');
    try {
      await updateAmbassador({ id: a.id, status: newStatus });
      flash('Statut mis à jour ✅');
      router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const handleCode = async (a: AmbassadorItem) => {
    const newCode = prompt('Nouveau code (lettres, chiffres, tirets) :', a.referralCode);
    if (!newCode || newCode.trim() === a.referralCode) return;
    setBusyId(a.id); setError('');
    try {
      await updateAmbassador({ id: a.id, referralCode: newCode.trim().toUpperCase() });
      flash('Code modifié ✅');
      router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const handlePayout = async (a: AmbassadorItem) => {
    if (a.stats.commissionPending <= 0) {
      setError('Aucune commission en attente pour cet ambassadeur.');
      return;
    }
    const amountStr = prompt(`Montant à verser à ${a.user.prenom} ${a.user.nom} (en attente : ${a.stats.commissionPending.toLocaleString('fr-FR')} FCFA) :`, String(a.stats.commissionPending));
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (!amount || amount <= 0) { setError('Montant invalide.'); return; }
    const note = prompt('Référence du versement (optionnel — ex: Wave 12/10) :') || '';
    if (!confirm(`Confirmer le versement de ${amount.toLocaleString('fr-FR')} FCFA ? Les commissions en attente passeront en "Payées".`)) return;

    setBusyId(a.id); setError('');
    try {
      const res = await fetch('/api/admin/ambassador-payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambassadorId: a.id, amount, note })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erreur');
      else { flash('Versement enregistré ✅'); router.refresh(); }
    } catch { setError('Erreur de connexion.'); }
    finally { setBusyId(null); }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'ACTIF': return { cls: 'bg-emerald-100 text-emerald-600', label: '✅ Actif' };
      case 'SUSPENDU': return { cls: 'bg-red-100 text-red-600', label: '⏸️ Suspendu' };
      default: return { cls: 'bg-yellow-100 text-yellow-700', label: '⏳ En attente' };
    }
  };

  return (
    <div className="space-y-6">

      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}
      {success && <div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{success}</div>}

      {/* ===== Création ===== */}
      <form onSubmit={handleCreate} className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-300 space-y-4">
        <h3 className="font-bold text-gray-800">➕ Créer un ambassadeur</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>Étudiant *</label>
            <select name="userId" required className={inputStyle}>
              <option value="">Sélectionner un étudiant...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelStyle}>Code (optionnel — généré automatiquement si vide)</label>
            <input name="referralCode" placeholder="Ex: DSA-NIGER01" className={inputStyle} />
          </div>
        </div>
        <p className="text-xs text-gray-400">L'ambassadeur est créé en statut "En attente" — clique ensuite sur "Valider" pour l'activer.</p>
        <button type="submit" disabled={loading}
          className="py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-50">
          {loading ? '⏳ Création...' : 'Créer'}
        </button>
      </form>

      {/* ===== Liste ===== */}
      <div>
        <h3 className="font-bold text-gray-800 mb-4">📋 Ambassadeurs ({ambassadors.length})</h3>
        {ambassadors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-2xl">Aucun ambassadeur pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {ambassadors.map(a => {
              const badge = statusBadge(a.status);
              const busy = busyId === a.id;
              return (
                <div key={a.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                  {/* En-tête */}
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-gray-800">{a.user.prenom} {a.user.nom}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">🔑 {a.referralCode}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{a.user.email}{a.user.pays ? ` · 🌍 ${a.user.pays}` : ''}{a.user.universite ? ` · 🏫 ${a.user.universite}` : ''}</p>
                    </div>
                    <Link href={`/admin/ambassadors/${a.id}`} className="text-xs font-bold text-blue-500 hover:underline whitespace-nowrap">
                      Détail →
                    </Link>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <div className="bg-blue-50 p-2.5 rounded-xl text-center"><p className="text-gray-400 font-bold">👥 Apportés</p><p className="font-extrabold text-blue-600 text-sm">{a.stats.users}</p></div>
                    <div className="bg-yellow-50 p-2.5 rounded-xl text-center"><p className="text-gray-400 font-bold">👑 Premium</p><p className="font-extrabold text-yellow-600 text-sm">{a.stats.premium}</p></div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl text-center"><p className="text-gray-400 font-bold">CA généré</p><p className="font-extrabold text-emerald-600 text-sm">{a.stats.caGenere.toLocaleString('fr-FR')} F</p></div>
                    <div className="bg-orange-50 p-2.5 rounded-xl text-center"><p className="text-gray-400 font-bold">⏳ En attente</p><p className="font-extrabold text-orange-500 text-sm">{a.stats.commissionPending.toLocaleString('fr-FR')} F</p></div>
                    <div className="bg-purple-50 p-2.5 rounded-xl text-center"><p className="text-gray-400 font-bold">✅ Versées</p><p className="font-extrabold text-purple-600 text-sm">{a.stats.commissionPaid.toLocaleString('fr-FR')} F</p></div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                    {a.status === 'EN_ATTENTE' && (
                      <button onClick={() => handleStatus(a, 'ACTIF')} disabled={busy}
                        className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase disabled:opacity-50">
                        {busy ? '⏳' : '✅ Valider'}
                      </button>
                    )}
                    {a.status === 'ACTIF' && (
                      <button onClick={() => handleStatus(a, 'SUSPENDU')} disabled={busy}
                        className="py-2 px-4 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 font-bold rounded-xl text-xs uppercase disabled:opacity-50">
                        {busy ? '⏳' : '⏸️ Suspendre'}
                      </button>
                    )}
                    {a.status === 'SUSPENDU' && (
                      <button onClick={() => handleStatus(a, 'ACTIF')} disabled={busy}
                        className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase disabled:opacity-50">
                        {busy ? '⏳' : '▶️ Réactiver'}
                      </button>
                    )}
                    <button onClick={() => handleCode(a)} disabled={busy}
                      className="py-2 px-4 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 font-bold rounded-xl text-xs uppercase disabled:opacity-50">
                      🔑 Modifier le code
                    </button>
                    {a.stats.commissionPending > 0 && (
                      <button onClick={() => handlePayout(a)} disabled={busy}
                        className="py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs uppercase disabled:opacity-50">
                        {busy ? '⏳' : `💰 Verser (${fmt(a.stats.commissionPending)})`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}