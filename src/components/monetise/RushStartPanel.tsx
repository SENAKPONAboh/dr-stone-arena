'use client';

import Coin from '@/components/ui/Coin';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { RETRY_RUSH_UA, RUSH_WEEKEND_CAP_UA, RUSH_PALIER_1_UA, RUSH_PALIER_2_UA, RUSH_PALIER_3_UA } from '@/lib/monetise';

export default function RushStartPanel({
  isWeekend, activeDays, flameOk, totalWeekend, sessionsCount, hasFinishedSession, ticketCount,
}: {
  isWeekend: boolean; activeDays: number; flameOk: boolean; totalWeekend: number;
  sessionsCount: number; hasFinishedSession: boolean; ticketCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const freeEligible = sessionsCount < 2 && flameOk;

  const handleStart = async (useTicket: boolean) => {
    if (!isWeekend) { setError("Le Rush est ouvert uniquement samedi et dimanche."); return; }
    let ok;
    if (useTicket) {
      ok = confirm("Utiliser un 🎫 Ticket Rush pour cette tentative ? (0 UA débité — le Ticket sera consommé)");
    } else if (freeEligible) {
      ok = confirm("Lancer une tentative GRATUITE ? Le Rush commence immédiatement (3 erreurs tolérées).");
    } else {
      ok = confirm(`Lancer une tentative supplémentaire ? ${RETRY_RUSH_UA.toLocaleString('fr-FR')} UA seront débitées de ton trésor Élite.`);
    }
    if (!ok) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/monetise/rush/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useTicket }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erreur');
      else router.refresh();
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {error && (
        <div className="bg-red-400/10 border-2 border-red-400/30 text-red-300 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>
      )}

      {hasFinishedSession && (
        <div className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl p-6 text-center">
          <p className="font-extrabold text-yellow-300">📊 Tentative terminée — vois le récapitulatif</p>
        </div>
      )}

      {/* Statut weekend */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6 text-center">
        <div className={`text-5xl mb-2 ${isWeekend ? "animate-flame" : ""}`}>⚔️</div>
        <h1 className="text-2xl font-extrabold text-white">{isWeekend ? "Rush ouvert !" : "Rush fermé"}</h1>
        <p className="text-white/40 text-sm mt-1">{isWeekend ? "Samedi et dimanche uniquement." : "Prochain Rush : samedi 00h00."}</p>
      </motion.div>

      {/* Flamme */}
      <div className="bg-white/5 border border-orange-400/20 rounded-2xl p-5 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="font-bold text-white/90 text-sm">{activeDays}/5 jours cette semaine</p>
            <p className="text-xs text-white/40">{flameOk ? "✅ Essais gratuits débloqués" : "❌ Essais gratuits verrouillés"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-white/40 uppercase">Week-end</p>
          <p className="font-extrabold text-yellow-300">{totalWeekend.toLocaleString('fr-FR')} / {RUSH_WEEKEND_CAP_UA.toLocaleString('fr-FR')} points de mérite</p>
          <p className="text-xs text-white/30">{sessionsCount} tentative{sessionsCount > 1 ? "s" : ""} jouée{sessionsCount > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Lancement */}
      <motion.button
        onClick={() => handleStart(false)}
        disabled={loading || !isWeekend || totalWeekend >= RUSH_WEEKEND_CAP_UA}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-5 bg-yellow-500 text-[#1a1308] font-extrabold text-lg uppercase tracking-wide rounded-2xl shadow-xl shadow-yellow-900/30 disabled:opacity-30"
      >
        {loading ? '⏳ Lancement...' : freeEligible ? "▶️ Lancer (gratuit)" : `▶️ Lancer — ${RETRY_RUSH_UA.toLocaleString('fr-FR')} UA`}
      </motion.button>

      {/* 🎫 Ticket Rush : alternative sans débit d'UA */}
      {!freeEligible && ticketCount > 0 && (
        <motion.button
          onClick={() => handleStart(true)}
          disabled={loading || !isWeekend || totalWeekend >= RUSH_WEEKEND_CAP_UA}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-white/5 border-2 border-yellow-500/40 text-yellow-300 font-extrabold uppercase tracking-wide rounded-2xl disabled:opacity-30"
        >
          🎫 Utiliser un Ticket <span className="text-xs opacity-70">({ticketCount} en stock — 0 UA)</span>
        </motion.button>
      )}

      <div className="bg-white/5 rounded-2xl p-4 text-xs text-white/40 space-y-1">
        <p>⚔️ 5 étages de 5 cas · la difficulté monte à chaque étage · 3 erreurs maximum</p>
        <p><Coin /> Étage 3 : +{RUSH_PALIER_1_UA.toLocaleString('fr-FR')} UA · Étage 4 : +{RUSH_PALIER_2_UA.toLocaleString('fr-FR')} UA · Étage 5 : +{RUSH_PALIER_3_UA.toLocaleString('fr-FR')} UA (ce qui est gagné est gardé)</p>
        <p>🎁 Étage 5 = Coffre d'Élite du Major (Gel + Restaure gratuits)</p>
        <p>🎫 Ticket Rush = tentative sans payer en UA · 🛡️ Bouclier absorbe 1 erreur · 🔄 Seconde Chance reprend après défaite · ⏱️ Temps Bonus +30 s</p>
      </div>
    </div>
  );
}