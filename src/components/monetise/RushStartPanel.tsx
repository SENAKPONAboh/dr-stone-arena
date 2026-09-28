'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function RushStartPanel({
  isWeekend, activeDays, flameOk, totalWeekend, sessionsCount, hasFinishedSession,
}: {
  isWeekend: boolean; activeDays: number; flameOk: boolean; totalWeekend: number; sessionsCount: number; hasFinishedSession: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!isWeekend) { setError("Le Rush est ouvert uniquement samedi et dimanche."); return; }
    if (sessionsCount < 2 && flameOk) {
      const ok = confirm("Lancer une tentative GRATUITE ? Le Rush commence immédiatement (3 erreurs tolérées).");
      if (!ok) return;
    } else {
      const ok = confirm("Lancer une tentative supplémentaire ? 15 000 UA seront débitées de ta cagnotte.");
      if (!ok) return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/monetise/rush/start', { method: 'POST' });
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
          <p className="font-extrabold text-yellow-300">{totalWeekend.toLocaleString('fr-FR')} / 50 000 UA</p>
          <p className="text-xs text-white/30">{sessionsCount} tentative{sessionsCount > 1 ? "s" : ""} jouée{sessionsCount > 1 ? "s" : ""}</p>
        </div>
      </div>

      <motion.button
        onClick={handleStart}
        disabled={loading || !isWeekend || totalWeekend >= 50000}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-5 bg-yellow-500 text-[#1a1308] font-extrabold text-lg uppercase tracking-wide rounded-2xl shadow-xl shadow-yellow-900/30 disabled:opacity-30"
      >
        {loading ? '⏳ Lancement...' : sessionsCount < 2 && flameOk ? "▶️ Lancer (gratuit)" : "▶️ Lancer — 15 000 UA"}
      </motion.button>

      <div className="bg-white/5 rounded-2xl p-4 text-xs text-white/40 space-y-1">
        <p>⚔️ Série continue · 3 erreurs maximum · paliers 10 / 15 / 25 cas</p>
        <p>🪙 Palier 1 : +10 000 UA · Palier 2 : +20 000 UA · Palier 3 : +20 000 UA</p>
        <p>🎁 Palier 3 = Coffre d'Élite du Major (Gel + Restaure gratuits)</p>
      </div>
    </div>
  );
}