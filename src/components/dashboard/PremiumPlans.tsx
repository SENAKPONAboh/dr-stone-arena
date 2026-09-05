'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PREMIUM_PLANS, getPlan } from '@/lib/premium';

type ActiveMethod = {
  id: string; name: string; icon: string | null; isManual: boolean;
  beneficiaryName: string | null; paymentIdentifier: string | null; instructions: string | null;
};

type PendingRequest = { tier: number | null; amount: number | null; methodName: string | null; methodIcon: string | null };

const PLAN_ICONS: Record<number, string> = { 1: '💠', 2: '💎', 3: '👑' };

export default function PremiumPlans({
  isPremium, premiumTier, pendingRequest, activeMethods
}: {
  isPremium: boolean;
  premiumTier: number | null;
  pendingRequest: PendingRequest | null;
  activeMethods: ActiveMethod[];
}) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const canSubscribe = !isPremium && pendingRequest === null;
  const selectedPlan = getPlan(selectedTier);
  const method = activeMethods.find(m => m.id === selectedMethod) ?? null;
  const manualMethods = activeMethods.filter(m => m.isManual);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTier) { setError("Sélectionne d'abord un plan Premium."); return; }
    if (!method) { setError("Sélectionne un moyen de paiement."); return; }

    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('receipt') as File;

    if (!file || file.size === 0) {
      setError('Veuillez sélectionner une image de reçu.');
      setLoading(false);
      return;
    }

    formData.append('tier', String(selectedTier));
    formData.append('paymentMethodId', method.id);

    try {
      const res = await fetch('/api/premium/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi.");
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  // Message de succès juste après l'envoi
  if (success && pendingRequest === null) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="w-full p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-center">
          <p className="font-bold text-emerald-600">✅ Reçu envoyé !</p>
          <p className="text-sm text-emerald-500 mt-1">L'administrateur va valider votre abonnement sous peu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Plan Gratuit */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <h3 className="text-xl font-bold text-gray-800">Gratuit</h3>
          <p className="text-gray-500 text-sm mb-6">Pour commencer en douceur</p>

          <div className="mb-6">
            <span className="text-4xl font-extrabold text-gray-800">0 FCFA</span>
            <span className="text-gray-500">/mois</span>
          </div>

          <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-grow">
            <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 10 Vies maximum</li>
            <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Régénération d'1 vie toutes les 24h</li>
            <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Accès aux cas cliniques de base</li>
            <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Classement et progression XP</li>
          </ul>

          <div className="w-full py-3 bg-gray-100 text-gray-400 font-bold rounded-2xl text-center uppercase tracking-wide text-sm">
            {!isPremium ? 'Votre plan actuel' : '—'}
          </div>
        </div>

        {/* Plans Premium */}
        {PREMIUM_PLANS.map((plan) => {
          const isCurrent = isPremium && premiumTier === plan.tier;
          const isSelected = selectedTier === plan.tier;

          return (
            <div
              key={plan.tier}
              onClick={() => canSubscribe && setSelectedTier(plan.tier)}
              className={`bg-white rounded-3xl shadow-xl border-2 p-8 flex flex-col relative transition-all ${isCurrent ? 'border-emerald-500' : isSelected ? 'border-blue-500' : 'border-yellow-400'} ${canSubscribe ? 'cursor-pointer hover:shadow-2xl' : ''}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  VOTRE PLAN ACTUEL
                </div>
              )}

              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                <span className="text-2xl">{PLAN_ICONS[plan.tier]}</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">Pour réviser sans limite</p>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-800">{plan.priceLabel}</span>
                <span className="text-gray-500">/mois</span>
              </div>

              <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-grow">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 10 Vies maximum</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Régénération d'1 vie {plan.regenLabel}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Accès à tous les cas exclusifs</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Accès aux Duels ({plan.dailyDuels} par jour)</li>
              </ul>

              {isCurrent ? (
                <div className="w-full py-3 bg-emerald-50 text-emerald-600 font-bold rounded-2xl text-center uppercase tracking-wide text-sm">
                  ✅ Abonnement Actif
                </div>
              ) : pendingRequest && (pendingRequest.tier === plan.tier || pendingRequest.tier === null) ? (
                <div className="w-full p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-center">
                  <p className="font-bold text-yellow-700">⏳ Reçu en cours de validation</p>
                  <p className="text-sm text-yellow-600 mt-1">
                    {pendingRequest.methodName ? `via ${pendingRequest.methodIcon ?? ''} ${pendingRequest.methodName}` : ''}
                    {pendingRequest.amount ? ` · ${pendingRequest.amount.toLocaleString('fr-FR')} FCFA` : ''}
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">L'administrateur va bientôt valider votre paiement.</p>
                </div>
              ) : (
                <div className={`w-full py-3 font-bold rounded-2xl text-center uppercase tracking-wide text-sm transition-all ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {isSelected ? '✓ Plan sélectionné' : 'Choisir ce plan'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Choix du moyen de paiement ===== */}
      {canSubscribe && selectedPlan && (
        <div className="mt-8 space-y-4">

          <h3 className="font-extrabold text-gray-800">💳 Choisis ton moyen de paiement</h3>

          {manualMethods.length === 0 ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
              <p className="font-bold text-yellow-700">Aucun moyen de paiement disponible actuellement</p>
              <p className="text-sm text-yellow-600 mt-1">Contacte l'administration pour finaliser ton abonnement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {manualMethods.map(m => {
                const isSel = selectedMethod === m.id;
                return (
                  <div key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-3 transition-all cursor-pointer hover:shadow-md ${isSel ? 'border-blue-500 shadow-md' : 'border-gray-100'}`}>
                    <span className="text-2xl">{m.icon || '💰'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.beneficiaryName || '—'}</p>
                    </div>
                    {isSel && <span className="text-blue-500 font-bold">✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== Récapitulatif + instructions dynamiques ===== */}
          {method && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900 space-y-2">
              <p className="font-bold text-base">Vous avez choisi {method.icon ? `${method.icon} ` : ''}{method.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p><span className="font-bold">Plan :</span> {selectedPlan?.name}</p>
                <p><span className="font-bold">Montant :</span> <span className="font-extrabold">{selectedPlan?.priceLabel}</span></p>
                {method.beneficiaryName && (
                  <p><span className="font-bold">Bénéficiaire :</span> {method.beneficiaryName}</p>
                )}
                {method.paymentIdentifier && (
                  <p><span className="font-bold">Numéro / identifiant :</span> <span className="font-extrabold">{method.paymentIdentifier}</span></p>
                )}
              </div>
              {method.instructions && (
                <p className="pt-2 border-t border-blue-200 text-blue-800">{method.instructions}</p>
              )}
              <p className="text-xs text-blue-600 pt-1">Prends une photo claire de ton reçu, puis téléverse-la ci-dessous.</p>
            </div>
          )}

          {/* ===== Upload du reçu ===== */}
          {method && method.isManual && (
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Photo du reçu de paiement</label>
                <input
                  type="file"
                  name="receipt"
                  accept="image/*"
                  required
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </button>
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}