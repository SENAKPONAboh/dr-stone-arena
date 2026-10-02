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
  const [converting, setConverting] = useState(false);

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

    // ===== Conversion HEIC (photos iPhone) en JPEG — lisible partout =====
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    let finalFile: Blob = file;
    if (isHeic) {
      setConverting(true);
      try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        finalFile = Array.isArray(converted) ? converted[0] : converted;
        formData.set('receipt', finalFile, 'recu.jpg');
      } catch (err) {
        setError("Impossible de convertir cette photo HEIC. Essaie plutôt une capture d'écran.");
        setLoading(false);
        setConverting(false);
        return;
      }
      setConverting(false);
    }

    // Vérifier la taille APRÈS conversion (le JPEG converti est plus lourd que le HEIC)
    if (finalFile.size > 4 * 1024 * 1024) {
      setError("L'image dépasse 4 Mo. Réduis-la ou prends une capture d'écran.");
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
        <div className="w-full rounded-2xl border-2 border-mala/40 bg-mala/10 p-5 text-center">
          <p className="font-display font-extrabold text-mala">✅ Reçu envoyé !</p>
          <p className="mt-1 text-sm text-ink">L'administrateur va valider votre abonnement sous peu.</p>
        </div>
      </div>
    );
  }

  const card = 'rounded-3xl border-2 bg-slab p-7 flex flex-col relative transition-all';

  return (
    <div className="max-w-3xl mx-auto">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Plan Gratuit */}
        <div className={`${card} border-line`}>
          <h3 className="font-display text-lg font-extrabold text-ink">Gratuit</h3>
          <p className="mb-6 text-sm text-mute">Pour commencer en douceur</p>

          <div className="mb-6">
            <span className="font-display text-3xl font-extrabold text-ink">0 FCFA</span>
            <span className="text-mute">/mois</span>
          </div>

          <ul className="mb-8 flex-grow space-y-3 text-sm text-ink">
            <li className="flex items-center gap-2"><span className="text-mala">✓</span> 10 Vies maximum</li>
            <li className="flex items-center gap-2"><span className="text-mala">✓</span> Régénération d'1 vie toutes les 24h</li>
            <li className="flex items-center gap-2"><span className="text-mala">✓</span> Accès aux cas cliniques de base</li>
            <li className="flex items-center gap-2"><span className="text-mala">✓</span> Classement et progression XP</li>
          </ul>

          <div className="w-full rounded-2xl bg-slab-2 py-3 text-center text-sm font-bold uppercase tracking-wide text-mute">
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
              className={`${card} ${isCurrent ? 'border-mala' : isSelected ? 'border-mala shadow-[0_0_0_4px_rgb(var(--mala-rgb)/0.2)]' : 'border-gold/60'} ${canSubscribe ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mala px-4 py-1 text-xs font-bold text-stone">
                  VOTRE PLAN ACTUEL
                </div>
              )}

              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-extrabold text-ink">{plan.name}</h3>
                <span className="text-2xl">{PLAN_ICONS[plan.tier]}</span>
              </div>
              <p className="mb-6 text-sm text-mute">Pour réviser sans limite</p>

              <div className="mb-6">
                <span className="font-display text-3xl font-extrabold text-ink">{plan.priceLabel}</span>
                <span className="text-mute">/mois</span>
              </div>

              <ul className="mb-8 flex-grow space-y-3 text-sm text-ink">
                <li className="flex items-center gap-2"><span className="text-mala">✓</span> 10 Vies maximum</li>
                <li className="flex items-center gap-2"><span className="text-mala">✓</span> Régénération d'1 vie {plan.regenLabel}</li>
                <li className="flex items-center gap-2"><span className="text-mala">✓</span> Accès à tous les cas exclusifs</li>
                <li className="flex items-center gap-2"><span className="text-mala">✓</span> Accès aux Duels ({plan.dailyDuels} par jour)</li>
              </ul>

              {isCurrent ? (
                <div className="w-full rounded-2xl bg-mala/15 py-3 text-center text-sm font-bold uppercase tracking-wide text-mala">
                  ✅ Abonnement Actif
                </div>
              ) : pendingRequest && (pendingRequest.tier === plan.tier || pendingRequest.tier === null) ? (
                <div className="w-full rounded-2xl border-2 border-gold/40 bg-gold/10 p-4 text-center">
                  <p className="font-bold text-gold">⏳ Reçu en cours de validation</p>
                  <p className="mt-1 text-sm text-ink">
                    {pendingRequest.methodName ? `via ${pendingRequest.methodIcon ?? ''} ${pendingRequest.methodName}` : ''}
                    {pendingRequest.amount ? ` · ${pendingRequest.amount.toLocaleString('fr-FR')} FCFA` : ''}
                  </p>
                  <p className="mt-1 text-xs text-mute">L'administrateur va bientôt valider votre paiement.</p>
                </div>
              ) : (
                <div className={`w-full rounded-2xl py-3 text-center text-sm font-bold uppercase tracking-wide transition-all ${isSelected ? 'bg-mala text-stone shadow-[0_4px_0_#0f7a4f]' : 'bg-slab-2 text-ink'}`}>
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

          <h3 className="font-display font-extrabold text-ink">💳 Choisis ton moyen de paiement</h3>

          {manualMethods.length === 0 ? (
            <div className="rounded-2xl border-2 border-gold/40 bg-gold/10 p-6 text-center">
              <p className="font-bold text-gold">Aucun moyen de paiement disponible actuellement</p>
              <p className="mt-1 text-sm text-ink">Contacte l'administration pour finaliser ton abonnement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {manualMethods.map(m => {
                const isSel = selectedMethod === m.id;
                return (
                  <div key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-all ${isSel ? 'border-mala bg-mala/10' : 'border-line bg-slab hover:border-mute'}`}>
                    <span className="text-2xl">{m.icon || '💰'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{m.name}</p>
                      <p className="truncate text-xs text-mute">{m.beneficiaryName || '—'}</p>
                    </div>
                    {isSel && <span className="font-bold text-mala">✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== Récapitulatif + instructions dynamiques (lisible en thème clair ET sombre) ===== */}
          {method && (
            <div className="space-y-3 rounded-2xl border-2 border-sky/40 bg-sky/10 p-5 text-sm text-ink">
              <p className="font-display text-base font-extrabold">Vous avez choisi {method.icon ? `${method.icon} ` : ''}{method.name}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slab p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-mute">Plan</p>
                  <p className="font-bold text-ink">{selectedPlan?.name}</p>
                </div>
                <div className="rounded-xl bg-slab p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-mute">Montant à envoyer</p>
                  <p className="font-display text-lg font-extrabold text-mala">{selectedPlan?.priceLabel}</p>
                </div>
                {method.beneficiaryName && (
                  <div className="rounded-xl bg-slab p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-mute">Bénéficiaire</p>
                    <p className="font-bold text-ink">{method.beneficiaryName}</p>
                  </div>
                )}
                {method.paymentIdentifier && (
                  <div className="rounded-xl bg-slab p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-mute">Numéro / identifiant</p>
                    <p className="select-all font-display text-lg font-extrabold tracking-wide text-ink">{method.paymentIdentifier}</p>
                  </div>
                )}
              </div>
              {method.instructions && (
                <p className="border-t border-line pt-3 text-ink">{method.instructions}</p>
              )}
              <p className="text-xs text-mute">Prends une photo claire de ton reçu, puis téléverse-la ci-dessous.</p>
            </div>
          )}

          {/* ===== Upload du reçu ===== */}
          {method && method.isManual && (
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-ink">Photo du reçu de paiement</label>
                <input
                  type="file"
                  name="receipt"
                  accept="image/*"
                  required
                  className="w-full text-sm text-mute file:mr-4 file:rounded-xl file:border-0 file:bg-mala/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-mala hover:file:bg-mala/25"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-mala py-4 font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {converting ? 'Conversion de la photo...' : loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </button>
              {error && <p className="text-center text-xs font-semibold text-heart">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
