'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const avantages = [
  { icon: "🪙", title: "+1 000 UA par cas réussi", desc: "Jusqu'à 10 000 UA par jour sur tes 10 cas quotidiens" },
  { icon: "⚔️", title: "Mode Rush le week-end", desc: "Jusqu'à 50 000 UA par week-end (paliers 10/15/25 cas)" },
  { icon: "🏪", title: "Boutique UA", desc: "Gels de Flamme, Tickets Rush, thèmes, cadres, titres" },
  { icon: "💰", title: "Retraits réels", desc: "Dès 200 000 UA — vers Orange Money et Moov Money" },
];

export default function PassPresentation({ passActive }: { passActive: boolean }) {
  return (
    <div className="space-y-6">

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {avantages.map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.4 }}
            className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6 flex items-start gap-4"
          >
            <div className="text-3xl flex-shrink-0">{a.icon}</div>
            <div>
              <p className="font-extrabold text-yellow-300">{a.title}</p>
              <p className="text-sm text-white/50 mt-1">{a.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {passActive ? (
        <Link href="/etudiant/monetise" className="block text-center py-4 bg-yellow-500 text-[#1a1308] font-extrabold rounded-2xl uppercase tracking-wide animate-glow-gold">
          ⚔️ Entrer dans la plateforme monétisée
        </Link>
      ) : (
        <div className="text-center py-6 bg-white/5 border-2 border-dashed border-yellow-500/30 rounded-3xl">
          <p className="font-extrabold text-yellow-400 text-lg">🚧 Système d'activation en préparation</p>
          <p className="text-sm text-white/40 mt-1">La phase U2 (achat du Pass par reçu + validation admin) arrive juste après ce squelette.</p>
        </div>
      )}

      <p className="text-xs text-white/30 text-center leading-relaxed">
        Ton compte classique reste inchangé et jouable en parallèle. La Flamme est partagée entre les deux plateformes.
        Le système monétisé ne touche ni l'XP, ni les vies, ni les classements du mode classique.
      </p>
    </div>
  );
}