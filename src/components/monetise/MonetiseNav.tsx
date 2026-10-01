'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

// ⚠️ Typage explicite : `phase` est OPTIONNEL — tous les éléments sont disponibles à présent,
// mais le champ reste prêt pour les futures entrées verrouillées (ex. Personnalisation).
const ITEMS: { href: string; label: string; icon: string; available: boolean; phase?: string }[] = [
  { href: '/etudiant/monetise', label: 'Dashboard', icon: '📊', available: true },
  { href: '/etudiant/monetise/jouer', label: 'Jouer', icon: '▶️', available: true },
  { href: '/etudiant/monetise/pass', label: 'Pass', icon: '🪙', available: true },
  { href: '/etudiant/monetise/rush', label: 'Rush', icon: '⚔️', available: true },
  { href: '/etudiant/monetise/boutique', label: 'Boutique', icon: '🏪', available: true },
  { href: '/etudiant/monetise/cagnotte', label: 'Trésor', icon: '💰', available: true },
];

export default function MonetiseNav({ passActive }: { passActive: boolean }) {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/5 backdrop-blur rounded-3xl border border-yellow-500/20 p-3 flex flex-wrap gap-2"
    >
      {ITEMS.map(item => {
        const active = item.href === '/etudiant/monetise' ? pathname === item.href : pathname.startsWith(item.href);
        if (!item.available) {
          return (
            <span key={item.href} className="py-2 px-4 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wide bg-white/5 text-white/20 cursor-not-allowed"
              title={item.phase ? `Disponible à la phase ${item.phase}` : 'Bientôt disponible'}>
              {item.icon} {item.label} 🔒
            </span>
          );
        }
        return (
          <motion.div key={item.href} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href={item.href}
              className={`block py-2 px-4 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wide transition-colors ${active
                ? 'bg-yellow-500 text-[#1a1308] shadow-lg shadow-yellow-500/30'
                : 'bg-white/5 text-yellow-200/60 hover:bg-yellow-500/10 hover:text-yellow-300'}`}>
              {item.icon} {item.label}
            </Link>
          </motion.div>
        );
      })}
    </motion.nav>
  );
}