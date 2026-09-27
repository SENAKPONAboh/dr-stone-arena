'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PassRequestItem = {
  id: string;
  createdAt: Date;
  displayUrl: string | null;
  user: { id: string; prenom: string; nom: string; email: string };
  paymentMethod: { name: string; icon: string | null } | null;
};

export default function PassValidationManager({ requests }: { requests: PassRequestItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const flash = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 2500); };

  const handleValidate = async (req: PassRequestItem, action: 'VALIDE' | 'REJETE') => {
    const labels: Record<string, string> = { VALIDE: 'valider', REJETE: 'rejeter' };
    if (!confirm(`Voulez-vous vraiment ${labels[action]} le Pass de ${req.user.prenom} ${req.user.nom} ?`)) return;
    setBusyId(req.id);
    setError('');
    try {
      const res = await fetch('/api/admin/validate-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, userId: req.user.id, action })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erreur');
      else { flash(action === 'VALIDE' ? 'Pass activé ✅' : 'Demande rejetée'); router.refresh(); }
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}
      {success && <div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{success}</div>}

      {requests.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune demande en attente</h2>
          <p className="text-gray-500">Toutes les demandes de Pass ont été traitées.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                {req.displayUrl ? (
                  <a href={req.displayUrl} target="_blank" rel="noopener noreferrer">
                    <img src={req.displayUrl} alt="Reçu de paiement" className="w-full h-auto rounded-2xl border-2 border-gray-100 object-cover hover:opacity-90 transition-opacity" />
                  </a>
                ) : (
                  <div className="w-full py-8 bg-red-50 border-2 border-red-100 rounded-2xl text-center">
                    <p className="text-red-500 font-bold text-sm">⚠️ Reçu illisible</p>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800">Demande de {req.user.prenom} {req.user.nom}</h3>
                <p className="text-sm text-gray-500 mb-2">Email : {req.user.email}</p>
                <p className="text-sm text-gray-500 mb-2">Moyen : <span className="font-bold text-gray-700">{req.paymentMethod ? `${req.paymentMethod.icon ?? ''} ${req.paymentMethod.name}` : 'Non précisé'}</span></p>
                <p className="text-sm text-gray-500 mb-4">Date : {new Date(req.createdAt).toLocaleString('fr-FR')}</p>
                <p className="text-xs text-blue-600 font-bold mb-4">Pass demandé : 2 000 FCFA / mois (30 jours)</p>
                <div className="mt-auto flex gap-3">
                  <button onClick={() => handleValidate(req, 'VALIDE')} disabled={busyId === req.id}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-50">
                    {busyId === req.id ? '⏳ Traitement...' : '✅ Activer le Pass'}
                  </button>
                  <button onClick={() => handleValidate(req, 'REJETE')} disabled={busyId === req.id}
                    className="flex-1 py-3 bg-red-50 border-2 border-red-100 text-red-600 font-extrabold rounded-2xl text-sm uppercase tracking-wide hover:bg-red-100 disabled:opacity-50">
                    ❌ Rejeter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}