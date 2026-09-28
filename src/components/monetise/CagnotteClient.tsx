'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WITHDRAWAL_MIN_UA, RECHARGE_MIN_UA, RECHARGE_STEP_UA, uaToFCFA } from '@/lib/monetise';

type PendingRequest = {
  id: string; amountUA: number; amountFCFA: number; operator: string;
  phoneNumber: string; accountName: string | null; status: string; createdAt: string;
};

type PendingRecharge = {
  id: string; amountUA: number; amountFCFA: number;
  methodName: string | null; methodIcon: string | null; createdAt: string;
};

type TxHistory = { id: string; type: string; amount: number; balanceAfter: number; createdAt: string };

type PaymentMethodUI = {
  id: string; name: string; icon: string | null;
  beneficiaryName: string | null; paymentIdentifier: string | null; instructions: string | null;
};

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  CAS_REUSSI: { label: 'Cas réussi', icon: '✅' },
  RUSH_P1: { label: 'Rush — Palier 1', icon: '🪙' },
  RUSH_P2: { label: 'Rush — Palier 2', icon: '🪙' },
  RUSH_P3: { label: 'Rush — Palier 3', icon: '🪙' },
  RUSH_COFFRE: { label: 'Coffre du Rush', icon: '🎁' },
  RECHARGE: { label: 'Recharge validée', icon: '⚡' },
  PASS_RENOUVELLEMENT: { label: 'Renouvellement du Pass', icon: '🪙' },
  ACHAT_BOUTIQUE: { label: 'Achat boutique', icon: '🏪' },
  TICKET_RUSH: { label: 'Ticket Rush utilisé', icon: '🎫' },
  RETRY_RUSH: { label: 'Retry direct', icon: '⚔️' },
  SECONDE_CHANCE: { label: 'Seconde Chance utilisée', icon: '🔄' },
  RETRAIT_BLOCAGE: { label: 'Retrait — UA bloquées', icon: '💰' },
  RETRAIT_PAYE: { label: 'Retrait payé', icon: '✅' },
  RETRAIT_REJETE: { label: 'Retrait rejeté — UA rendues', icon: '❌' },
  RETRAIT_ANNUL: { label: 'Retrait annulé — UA rendues', icon: '↩️' },
  ADMIN_CORRECTION: { label: 'Correction admin', icon: '🛠️' },
};

function AnimatedCounter({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <span>{value.toLocaleString('fr-FR')}</span>;
}

export default function CagnotteClient({
  uaBalance, uaLocked, pendingRequest, pendingRecharge, history, paymentMethods,
}: {
  uaBalance: number; uaLocked: number; pendingRequest: PendingRequest | null;
  pendingRecharge: PendingRecharge | null; history: TxHistory[]; paymentMethods: PaymentMethodUI[];
}) {
  // ===== RETRAIT =====
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? '');
  const [phone, setPhone] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ===== RECHARGE =====
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeMethodId, setRechargeMethodId] = useState(paymentMethods[0]?.id ?? '');
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);

  const selectedMethod = paymentMethods.find(m => m.id === methodId) ?? null;
  const rechargeMethod = paymentMethods.find(m => m.id === rechargeMethodId) ?? null;

  // Validations retrait
  const amountNum = parseInt(amount || '0', 10) || 0;
  const amountError = amountNum === 0 ? ''
    : amountNum % 100 !== 0 ? 'Multiple de 100 UA requis (100 UA = 1 FCFA).'
    : amountNum < WITHDRAWAL_MIN_UA ? `Minimum : ${WITHDRAWAL_MIN_UA.toLocaleString('fr-FR')} UA (2 000 FCFA).`
    : amountNum > uaBalance ? 'Montant supérieur à ton solde disponible.'
    : '';
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneOk = phoneDigits.length >= 8 && phoneDigits.length <= 15;
  const canWithdraw = !pendingRequest && uaBalance >= WITHDRAWAL_MIN_UA && paymentMethods.length > 0;

  // Validations recharge (règles validées : min 10 000, multiples de 10 000, pas de max)
  const rechargeAmountNum = parseInt(rechargeAmount || '0', 10) || 0;
  const rechargeAmountError = rechargeAmountNum === 0 ? ''
    : rechargeAmountNum % RECHARGE_STEP_UA !== 0 ? `Multiple de ${RECHARGE_STEP_UA.toLocaleString('fr-FR')} UA requis (10 000 UA = 100 FCFA).`
    : rechargeAmountNum < RECHARGE_MIN_UA ? `Minimum : ${RECHARGE_MIN_UA.toLocaleString('fr-FR')} UA (100 FCFA).`
    : '';

  const submitWithdraw = async () => {
    if (amountError || !phoneOk || submitting || !selectedMethod) return;
    if (!confirm(`Demander le retrait de ${amountNum.toLocaleString('fr-FR')} UA (= ${uaToFCFA(amountNum).toLocaleString('fr-FR')} FCFA) sur ${selectedMethod.name} ${phoneDigits} ?`)) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/monetise/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE', amountUA: amountNum, paymentMethodId: methodId, phoneNumber: phoneDigits, accountName: accountName || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); return; }
      window.location.reload();
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelWithdraw = async () => {
    if (!pendingRequest || submitting) return;
    if (!confirm('Annuler ta demande de retrait ? Tes UA te seront rendues immédiatement.')) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/monetise/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', requestId: pendingRequest.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); return; }
      window.location.reload();
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  // ⚡ Envoi de la demande de recharge (FormData avec le reçu — pattern Pass)
  const handleRechargeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rechargeAmountError || rechargeAmountNum < RECHARGE_MIN_UA || !rechargeMethodId) return;

    const formData = new FormData(e.currentTarget);
    const file = formData.get('receipt') as File;
    if (!file || file.size === 0) { setError('Veuillez sélectionner une image de reçu.'); return; }
    formData.append('amountUA', String(rechargeAmountNum));
    formData.append('paymentMethodId', rechargeMethodId);

    setRechargeSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/monetise/recharge', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Erreur lors de l'envoi."); return; }
      window.location.reload();
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setRechargeSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Hero solde */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
        className="animate-gold-flow bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-3xl p-8 text-center text-[#1a1308] shadow-2xl shadow-yellow-900/30"
      >
        <p className="text-sm font-bold uppercase tracking-widest opacity-70">Ton solde disponible</p>
        <p className="text-5xl font-extrabold mt-2 tabular-nums">🪙 <AnimatedCounter target={uaBalance} /></p>
        <p className="text-sm font-bold mt-2 opacity-70">≈ {uaToFCFA(uaBalance).toLocaleString('fr-FR')} FCFA</p>
        {uaLocked > 0 && (
          <p className="text-xs font-bold mt-3 opacity-80">🔒 {uaLocked.toLocaleString('fr-FR')} UA bloquées — retrait en cours de traitement</p>
        )}
      </motion.div>

      {error && (
        <div className="bg-red-400/10 border-2 border-red-400/30 text-red-300 px-4 py-3 rounded-2xl text-sm font-bold text-center">{error}</div>
      )}

      {/* ===== Demande de retrait en cours ===== */}
      {pendingRequest && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-extrabold text-white">⏳ Demande de retrait en cours</h2>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${pendingRequest.status === 'EN_ATTENTE' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>
              {pendingRequest.status === 'EN_ATTENTE' ? 'En attente de vérification' : 'En traitement'}
            </span>
          </div>
          <div className="space-y-1 text-sm text-white/60">
            <p>Montant : <span className="font-extrabold text-yellow-300">{pendingRequest.amountUA.toLocaleString('fr-FR')} UA</span> → <span className="font-extrabold text-emerald-300">{pendingRequest.amountFCFA.toLocaleString('fr-FR')} FCFA</span></p>
            <p>{pendingRequest.operator} · {pendingRequest.phoneNumber}{pendingRequest.accountName ? ` · ${pendingRequest.accountName}` : ''}</p>
            <p className="text-xs text-white/30">Demandé le {new Date(pendingRequest.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          <p className="text-xs text-white/40 mt-4">🔒 Ces UA sont bloquées jusqu'au paiement — elles te seront rendues si la demande est rejetée.</p>
          {pendingRequest.status === 'EN_ATTENTE' && (
            <button onClick={cancelWithdraw} disabled={submitting}
              className="mt-4 w-full py-3 bg-white/5 border-2 border-red-400/40 text-red-300 font-bold rounded-2xl text-sm hover:bg-red-400/10 disabled:opacity-40">
              ↩️ Annuler ma demande (UA rendues)
            </button>
          )}
        </motion.div>
      )}

      {/* ===== Formulaire de retrait ===== */}
      {!pendingRequest && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
          <h2 className="font-extrabold text-white mb-1">💰 Demander un retrait</h2>
          <p className="text-xs text-white/40 mb-5">100 UA = 1 FCFA · Minimum {WITHDRAWAL_MIN_UA.toLocaleString('fr-FR')} UA (2 000 FCFA) · Paiement manuel après vérification — tu seras notifié.</p>

          {uaBalance < WITHDRAWAL_MIN_UA && (
            <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-5 text-center text-sm text-white/50">
              💵 Solde insuffisant pour un retrait — il te faut au moins {WITHDRAWAL_MIN_UA.toLocaleString('fr-FR')} UA (tu en as {uaBalance.toLocaleString('fr-FR')}). Tu peux aussi ⚡ recharger ci-dessous.
            </div>
          )}

          {uaBalance >= WITHDRAWAL_MIN_UA && paymentMethods.length === 0 && (
            <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-5 text-center text-sm text-white/50">
              🏦 Aucun moyen de paiement disponible pour le moment — reviens bientôt.
            </div>
          )}

          {canWithdraw && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Montant (UA)</label>
                <input
                  type="number" inputMode="numeric" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Entre ${WITHDRAWAL_MIN_UA.toLocaleString('fr-FR')} et ${uaBalance.toLocaleString('fr-FR')}`}
                  className="w-full mt-2 bg-white/5 border-2 border-yellow-500/30 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder:text-white/20 focus:border-yellow-400 outline-none"
                />
                {amountNum >= 100 && (
                  <p className="text-sm font-extrabold text-emerald-300 mt-2">≈ {uaToFCFA(amountNum).toLocaleString('fr-FR')} FCFA sur ton compte mobile money</p>
                )}
                {amountError && <p className="text-xs text-red-300 mt-1 font-bold">{amountError}</p>}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Moyen de paiement</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {paymentMethods.map(m => (
                    <button type="button" key={m.id} onClick={() => setMethodId(m.id)}
                      className={`py-3 px-4 rounded-2xl border-2 font-bold text-sm flex items-center gap-2 transition-all ${methodId === m.id
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                        : 'border-white/10 text-white/50'}`}>
                      <span className="text-lg">{m.icon ?? '🏦'}</span> {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Numéro de téléphone</label>
                <input
                  type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex : 07 00 00 00 00"
                  className="w-full mt-2 bg-white/5 border-2 border-yellow-500/30 rounded-2xl px-4 py-3 text-white font-bold placeholder:text-white/20 focus:border-yellow-400 outline-none"
                />
                {phone.length > 0 && !phoneOk && <p className="text-xs text-red-300 mt-1 font-bold">Numéro invalide (8 à 15 chiffres).</p>}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Nom du compte <span className="opacity-50">(optionnel)</span></label>
                <input
                  type="text" value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Nom enregistré sur le compte mobile money"
                  className="w-full mt-2 bg-white/5 border-2 border-yellow-500/30 rounded-2xl px-4 py-3 text-white font-bold placeholder:text-white/20 focus:border-yellow-400 outline-none"
                />
              </div>

              <motion.button
                onClick={submitWithdraw} disabled={submitting || !!amountError || !phoneOk || !selectedMethod}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-[#1a1308] text-lg font-extrabold rounded-2xl uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '⏳ Envoi…' : '💰 Demander le retrait'}
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      {/* ===== ⚡ RECHARGE EN ATTENTE ===== */}
      {pendingRecharge && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border-2 border-emerald-500/30 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-extrabold text-white">⚡ Recharge en cours de vérification</h2>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">En attente</span>
          </div>
          <div className="space-y-1 text-sm text-white/60">
            <p>Montant : <span className="font-extrabold text-yellow-300">{pendingRecharge.amountUA.toLocaleString('fr-FR')} UA</span> ({pendingRecharge.amountFCFA.toLocaleString('fr-FR')} FCFA payés)</p>
            {pendingRecharge.methodName && (
              <p>{pendingRecharge.methodIcon ?? '🏦'} {pendingRecharge.methodName}</p>
            )}
            <p className="text-xs text-white/30">Demandée le {new Date(pendingRecharge.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          <p className="text-xs text-white/40 mt-4">⏳ Ton reçu est en vérification — aucune UA n'est créditée avant la validation de l'administration. Tu seras notifié.</p>
        </motion.div>
      )}

      {/* ===== ⚡ FORMULAIRE DE RECHARGE ===== */}
      {!pendingRecharge && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
          <h2 className="font-extrabold text-white mb-1">⚡ Recharger mes UA</h2>
          <p className="text-xs text-white/40 mb-5">
            100 UA = 1 FCFA · Minimum {RECHARGE_MIN_UA.toLocaleString('fr-FR')} UA (100 FCFA) · par multiples de {RECHARGE_STEP_UA.toLocaleString('fr-FR')} UA · crédit après vérification du reçu
          </p>

          {paymentMethods.length === 0 ? (
            <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-5 text-center text-sm text-white/50">
              🏦 Aucun moyen de paiement disponible pour le moment — reviens bientôt.
            </div>
          ) : (
            <form onSubmit={handleRechargeSubmit} className="space-y-5">

              {/* Montant */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Montant en UA</label>
                <input
                  type="number" inputMode="numeric" value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder={`Ex : 50000 (= 500 FCFA) — multiples de ${RECHARGE_STEP_UA.toLocaleString('fr-FR')}`}
                  className="w-full mt-2 bg-white/5 border-2 border-yellow-500/30 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder:text-white/20 focus:border-yellow-400 outline-none"
                />
                {rechargeAmountNum >= RECHARGE_MIN_UA && (
                  <p className="text-sm font-extrabold text-emerald-300 mt-2">≈ {uaToFCFA(rechargeAmountNum).toLocaleString('fr-FR')} FCFA à envoyer</p>
                )}
                {rechargeAmountError && <p className="text-xs text-red-300 mt-1 font-bold">{rechargeAmountError}</p>}
              </div>

              {/* Moyen de paiement */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Moyen de paiement</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {paymentMethods.map(m => (
                    <button type="button" key={m.id} onClick={() => setRechargeMethodId(m.id)}
                      className={`py-3 px-4 rounded-2xl border-2 font-bold text-sm flex items-center gap-2 transition-all ${rechargeMethodId === m.id
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                        : 'border-white/10 text-white/50'}`}>
                      <span className="text-lg">{m.icon ?? '🏦'}</span> {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions dynamiques */}
              {rechargeMethod && (
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-5 text-sm text-blue-200 space-y-2">
                  <p className="font-bold text-base">Instructions pour {rechargeMethod.icon} {rechargeMethod.name} :</p>
                  <p>1. Envoyez <span className="font-extrabold">{uaToFCFA(Math.max(0, rechargeAmountNum)).toLocaleString('fr-FR')} FCFA</span> au numéro <span className="font-extrabold">{rechargeMethod.paymentIdentifier || '—'}</span>{rechargeMethod.beneficiaryName ? ` (${rechargeMethod.beneficiaryName})` : ''}.</p>
                  {rechargeMethod.instructions && <p className="text-blue-300/70">{rechargeMethod.instructions}</p>}
                  <p className="text-xs text-blue-300/50">2. Prends une photo claire du reçu. 3. Envoie-la ci-dessous.</p>
                </div>
              )}

              {/* Reçu + envoi */}
              {rechargeMethod && (
                <>
                  <div>
                    <label className="block text-yellow-200/70 text-sm font-bold mb-2">Photo du reçu de paiement</label>
                    <input type="file" name="receipt" accept="image/*" required
                      className="w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/20 file:text-yellow-300 hover:file:bg-yellow-500/30" />
                  </div>
                  <motion.button type="submit"
                    disabled={rechargeSubmitting || !!rechargeAmountError || rechargeAmountNum < RECHARGE_MIN_UA || !rechargeMethodId}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-[#1a1308] text-lg font-extrabold rounded-2xl uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed">
                    {rechargeSubmitting ? '⏳ Envoi en cours…' : '⚡ Envoyer ma demande de recharge'}
                  </motion.button>
                </>
              )}
            </form>
          )}
        </motion.div>
      )}

      {/* ===== Historique ===== */}
      <div className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
        <h2 className="font-extrabold text-white mb-4">📜 Historique de ta cagnotte</h2>
        {history.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">Aucune transaction pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {history.map((t, i) => {
              const info = TYPE_LABELS[t.type] ?? { label: t.type, icon: '•' };
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.6) }}
                  className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                  <span className="text-xl">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/80 truncate">{info.label}</p>
                    <p className="text-[10px] text-white/30">{new Date(t.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-extrabold ${t.amount > 0 ? 'text-green-300' : t.amount < 0 ? 'text-red-300' : 'text-white/40'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('fr-FR')} UA
                    </p>
                    <p className="text-[10px] text-white/30">solde {t.balanceAfter.toLocaleString('fr-FR')}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}