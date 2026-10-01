'use client';

import Coin from '@/components/ui/Coin';
import { motion } from 'framer-motion';
import Link from 'next/link';
import PassPurchaseForm from '@/components/monetise/PassPurchaseForm';

type ActiveMethod = {
  id: string; name: string; icon: string | null;
  beneficiaryName: string | null; paymentIdentifier: string | null; instructions: string | null;
};

export default function PassPresentation({
  passActive, passExpiresAt, pendingRequest, activeMethods
}: {
  passActive: boolean;
  passExpiresAt: string | null;
  pendingRequest: { methodName: string | null; methodIcon: string | null; createdAt: string } | null;
  activeMethods: ActiveMethod[];
}) {
  const daysLeft = passExpiresAt
    ? Math.max(0, Math.ceil((new Date(passExpiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gold p-10 text-center text-stone shadow-[0_6px_0_#9a6a12]"
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/25 animate-shimmer" />
        <div className="relative animate-float text-6xl mb-3"><Coin /></div>
        <h1 className="relative font-display text-3xl font-extrabold">Pass Élite</h1>
        <p className="relative text-lg font-bold mt-2 opacity-70">Ton accès à l'Espace Élite de Dr. Stone Arena</p>
        <p className="relative text-3xl font-extrabold mt-6">2 000 FCFA <span className="text-base opacity-60">/ mois</span></p>
      </motion.div>

      {/* Ce que le Pass apporte (avant la Prime) */}
      <div className="rounded-3xl border border-gold/20 bg-white/5 p-6">
        <h2 className="mb-3 font-display text-sm font-extrabold text-gold">Ce que le Pass Élite t'apporte</h2>
        <ul className="grid grid-cols-1 gap-2 text-sm text-ink sm:grid-cols-2">
          {[
            ['Cas Élite', "10 cas par jour, réservés à l'Espace Élite"],
            ['Rush du week-end', 'Une série de cas avec des paliers de mérite'],
            ['Boutique', 'Objets Flamme, tentatives Rush et coffres'],
            ['Personnalisation', 'Cadres, thèmes et titres pour ton profil'],
            ['Classement Élite', "Mesure-toi aux autres membres de l'Espace Élite"],
            ['Prime Arena', 'Une bourse de mérite qui récompense la performance'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-2xl bg-white/5 p-3">
              <p className="font-bold text-gold">{t}</p>
              <p className="text-xs text-mute">{d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-mute">Le Pass Élite donne accès à l'Espace Élite : cas Élite, Rush, boutique, personnalisation et classement. Tu paies un accès, pas une mise. La Prime Arena récompense ton travail et ta performance : elle n'est pas garantie et ne dépend pas de ce que tu paies.</p>
      </div>

      {/* État 1 : en attente de validation */}
      {pendingRequest && (
        <div className="bg-yellow-400/10 border-2 border-yellow-400/30 rounded-3xl p-8 text-center">
          <div className="text-5xl mb-3 animate-flame">⏳</div>
          <p className="font-extrabold text-yellow-300 text-xl">Reçu en cours de validation</p>
          <p className="text-sm text-white/50 mt-2">
            {pendingRequest.methodIcon} {pendingRequest.methodName ? `via ${pendingRequest.methodName}` : ''}
            Demande envoyée le {new Date(pendingRequest.createdAt).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-xs text-white/30 mt-2">L'administrateur validera ton Pass sous peu.</p>
        </div>
      )}

      {/* État 2 : Pass actif */}
      {passActive && !pendingRequest && (
        <div className="bg-emerald-400/10 border-2 border-emerald-400/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-extrabold text-emerald-300 text-xl">✅ Pass actif — {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</p>
            <p className="text-xs text-white/40 mt-1">Expiration : {passExpiresAt ? new Date(passExpiresAt).toLocaleDateString('fr-FR', { day: "2-digit", month: "long", year: "numeric" }) : '—'}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/etudiant/monetise" className="py-3 px-6 bg-yellow-500 text-[#1a1308] font-extrabold rounded-2xl text-sm uppercase tracking-wide animate-glow-gold">
              ⚔️ Entrer
            </Link>
          </div>
        </div>
      )}

      {/* État 3 : formulaire d'achat (ou de renouvellement) */}
      {!pendingRequest && (
        <PassPurchaseForm activeMethods={activeMethods} passActive={passActive} />
      )}

      <p className="text-xs text-white/30 text-center leading-relaxed">
        Ton compte classique reste inchangé et jouable en parallèle. La Flamme est partagée entre les deux plateformes.
        L'Espace Élite ne touche ni l'XP, ni les vies, ni les classements du mode classique.
      </p>
    </div>
  );
}