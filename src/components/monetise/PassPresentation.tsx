'use client';

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
        className="animate-gold-flow bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-3xl p-10 text-center text-[#1a1308] shadow-2xl"
      >
        <div className="animate-float text-6xl mb-3">🪙</div>
        <h1 className="text-4xl font-extrabold">Pass Arène Monétisé</h1>
        <p className="text-lg font-bold mt-2 opacity-70">La nouvelle dimension de Dr. Stone Arena</p>
        <p className="text-3xl font-extrabold mt-6">2 000 FCFA <span className="text-base opacity-60">/ mois</span></p>
      </motion.div>

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
        Le système monétisé ne touche ni l'XP, ni les vies, ni les classements du mode classique.
      </p>
    </div>
  );
}