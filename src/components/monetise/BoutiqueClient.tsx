'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import confetti from 'canvas-confetti';

type ShopItem = {
  id: string; name: string; category: string;
  priceUA: number; icon: string | null; description: string | null;
};

type InventoryItem = {
  itemId: string; name: string; icon: string | null; quantity: number;
  category: string; effectKey: string | null;
};

type LootItem = { itemId: string; name: string; icon: string | null; description: string | null };
type PurchaseResult = {
  success: boolean; balanceAfter: number;
  itemName?: string; chestName?: string; chestIcon?: string | null; loot?: LootItem[] | null;
};

const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff'];

const CATEGORIES = [
  { key: 'FLAMME', label: 'Flamme', icon: '🔥' },
  { key: 'RUSH', label: 'Rush', icon: '⚡' },
  { key: 'COFFRE', label: 'Coffres', icon: '🎁' },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function BoutiqueClient({
  items, inventory, uaBalance, flameProtectedUntil, flameLostAt, lostStreak,
}: {
  items: ShopItem[]; inventory: InventoryItem[]; uaBalance: number;
  flameProtectedUntil?: string | null; flameLostAt?: string | null; lostStreak?: number;
}) {
  const [balance, setBalance] = useState(uaBalance);
  const [stock, setStock] = useState<InventoryItem[]>(inventory);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [reveal, setReveal] = useState<PurchaseResult | null>(null);

  // État Flamme (mis à jour après chaque activation)
  const [protectionUntil, setProtectionUntil] = useState(flameProtectedUntil ?? null);
  const [lostFlameAt, setLostFlameAt] = useState(flameLostAt ?? null);
  const [lostStreakValue, setLostStreakValue] = useState(lostStreak ?? 0);

  const protectionActive = !!protectionUntil && new Date(protectionUntil) > new Date();
  const restorable = !!lostFlameAt && lostStreakValue > 0 &&
    Date.now() - new Date(lostFlameAt).getTime() < 48 * 3600 * 1000;

  const stockOf = (itemId: string) => stock.find(s => s.itemId === itemId)?.quantity ?? 0;

  const incrementStock = (itemId: string, name: string, icon: string | null) => {
    setStock(prev => {
      const found = prev.find(s => s.itemId === itemId);
      if (found) return prev.map(s => (s.itemId === itemId ? { ...s, quantity: s.quantity + 1 } : s));
      return [...prev, { itemId, name, icon, quantity: 1, category: 'FLAMME', effectKey: null }];
    });
  };

  const decrementStock = (itemId: string) => {
    setStock(prev => {
      const found = prev.find(s => s.itemId === itemId);
      if (!found) return prev;
      if (found.quantity <= 1) return prev.filter(s => s.itemId !== itemId);
      return prev.map(s => (s.itemId === itemId ? { ...s, quantity: s.quantity - 1 } : s));
    });
  };

  const buy = async (item: ShopItem) => {
    const verb = item.category === 'COFFRE' ? 'ouvrir' : 'acheter';
    if (!confirm(`Confirmer : ${verb} « ${item.name} » pour ${item.priceUA.toLocaleString('fr-FR')} UA ?`)) return;
    setLoadingId(item.id);
    setError('');
    setFlash('');
    try {
      const res = await fetch('/api/monetise/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); return; }
      setBalance(data.balanceAfter);
      if (data.loot) {
        (data.loot as LootItem[]).forEach(l => incrementStock(l.itemId, l.name, l.icon));
        setReveal(data);
        const end = Date.now() + 1600;
        const interval = setInterval(() => {
          if (Date.now() > end) { clearInterval(interval); return; }
          confetti({ particleCount: 50, spread: 70, startVelocity: 38, origin: { x: Math.random(), y: Math.random() * 0.35 }, colors: GOLD_CONFETTI });
        }, 350);
      } else {
        incrementStock(item.id, item.name, item.icon);
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.75 }, colors: GOLD_CONFETTI });
        setFlash(`✅ ${data.itemName} ajouté à ton inventaire`);
        setTimeout(() => setFlash(''), 3500);
      }
    } catch {
      setError('Impossible de joindre le serveur. Réessaie.');
    } finally {
      setLoadingId(null);
    }
  };

  // ===== ACTIVATION (règle : achat ≠ activation — le joueur choisit le moment) =====
  const useItem = async (item: InventoryItem) => {
    if (!confirm(`Utiliser « ${item.name} » maintenant ?`)) return;
    setLoadingId(item.itemId);
    setError('');
    setFlash('');
    try {
      const res = await fetch('/api/monetise/shop/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.itemId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); return; }
      decrementStock(item.itemId);
      if (data.flameProtectedUntil) setProtectionUntil(data.flameProtectedUntil);
      if (data.streak) { setLostStreakValue(0); setLostFlameAt(null); }
      setFlash(data.message || '✅ Objet utilisé');
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.75 }, colors: GOLD_CONFETTI });
      setTimeout(() => setFlash(''), 4500);
    } catch {
      setError('Impossible de joindre le serveur. Réessaie.');
    } finally {
      setLoadingId(null);
    }
  };

  let cardIndex = 0;

  return (
    <div className="space-y-6">

      {/* En-tête + solde */}
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">🏪 Boutique de l'Arène</h1>
          <p className="text-xs text-white/40 mt-1">Objets Flamme · Rush · Coffres — jamais d'UA retirable dans les coffres</p>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-white/5 border-2 border-yellow-500/30 text-yellow-300 font-extrabold animate-glow-gold whitespace-nowrap">
          🪙 {balance.toLocaleString('fr-FR')} UA
        </div>
      </div>

      {error && (
        <div className="bg-red-400/10 border-2 border-red-400/30 text-red-300 px-4 py-3 rounded-2xl text-sm font-bold text-center">{error}</div>
      )}
      {flash && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-green-400/10 border-2 border-green-400/30 text-green-300 px-4 py-3 rounded-2xl text-sm font-bold text-center">{flash}</motion.div>
      )}

      {/* Sections par catégorie */}
      {CATEGORIES.map(cat => {
        const catItems = items.filter(i => i.category === cat.key);
        if (catItems.length === 0) return null;
        return (
          <div key={cat.key} className="space-y-3">
            <h2 className="font-extrabold text-white/70 text-sm uppercase tracking-wider">{cat.icon} {cat.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catItems.map(item => {
                const i = cardIndex++;
                const affordable = balance >= item.priceUA;
                const isChest = item.category === 'COFFRE';
                return (
                  <motion.div key={item.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                    className="bg-white/5 border border-yellow-500/20 rounded-3xl p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-4xl animate-float">{item.icon ?? '📦'}</span>
                      {stockOf(item.id) > 0 && !isChest && (
                        <span className="text-[10px] font-extrabold bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">×{stockOf(item.id)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-white">{item.name}</p>
                      <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <p className="text-sm font-extrabold text-yellow-300">🪙 {item.priceUA.toLocaleString('fr-FR')}</p>
                      <motion.button
                        onClick={() => buy(item)}
                        disabled={loadingId === item.id || !affordable}
                        whileHover={affordable ? { scale: 1.04 } : undefined}
                        whileTap={affordable ? { scale: 0.96 } : undefined}
                        className={`py-2 px-4 rounded-2xl font-extrabold text-xs uppercase tracking-wide whitespace-nowrap ${!affordable
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : isChest
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-[#1a1308]'
                            : 'bg-yellow-500 text-[#1a1308]'}`}
                      >
                        {loadingId === item.id ? '⏳...' : !affordable ? 'Solde insuffisant' : isChest ? 'Ouvrir' : 'Acheter'}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Inventaire + activation */}
      <div className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
        <h2 className="font-extrabold text-white mb-2">🎒 Ton inventaire</h2>
        <p className="text-xs text-white/40 mb-4">
          Règle de l'Arène : <span className="text-yellow-300/70 font-bold">achat ≠ activation</span> — tes objets ne sont consommés que quand TU choisis de les utiliser.
        </p>

        {protectionActive && protectionUntil && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-yellow-500/20 to-amber-400/10 border-2 border-yellow-500/40 rounded-2xl p-4 mb-4 text-center">
            <p className="font-extrabold text-yellow-300">🛡️ Flamme protégée jusqu'au {fmt(protectionUntil)}</p>
            <p className="text-xs text-white/40 mt-1">Pendant la protection, ton absence ne casse pas ta Flamme.</p>
          </motion.div>
        )}
        {restorable && lostFlameAt && (
          <div className="bg-orange-500/10 border-2 border-orange-400/40 rounded-2xl p-4 mb-4 text-center">
            <p className="font-extrabold text-orange-300">🔥 Flamme perdue : {lostStreakValue} jours</p>
            <p className="text-xs text-white/40 mt-1">
              Restaurable jusqu'au {fmt(new Date(new Date(lostFlameAt).getTime() + 48 * 3600 * 1000).toISOString())} avec un Restaure-Flamme.
            </p>
          </div>
        )}

        {stock.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">Inventaire vide — fais un tour de la boutique ci-dessus !</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stock.map((s, i) => {
              const isFlame = s.category === 'FLAMME';
              const blockedByProtection =
                (s.effectKey === 'GEL_FLAMME' || s.effectKey === 'ASSURANCE_FLAMME') && protectionActive;
              const restaureBlocked = s.effectKey === 'RESTAURE_FLAMME' && !restorable;
              const disabled = loadingId === s.itemId || blockedByProtection || restaureBlocked;
              return (
                <motion.div key={s.itemId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/5 rounded-2xl p-3 flex items-center gap-3">
                  <span className="text-2xl">{s.icon ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/80 truncate">{s.name}</p>
                    {s.category === 'RUSH' && (
                      <p className="text-[10px] text-white/30">⚔️ S'utilise dans le Rush (prochaine mise à jour)</p>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-yellow-300">×{s.quantity}</span>
                  {isFlame && (
                    <button
                      onClick={() => useItem(s)}
                      disabled={disabled}
                      title={blockedByProtection ? 'Une protection Flamme est déjà active.' : restaureBlocked ? 'Aucune perte récente à restaurer (48 h).' : ''}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold uppercase whitespace-nowrap ${disabled
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-yellow-500 text-[#1a1308] hover:bg-yellow-400'}`}
                    >
                      {loadingId === s.itemId ? '⏳' : 'Utiliser'}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Révélation de coffre */}
      <AnimatePresence>
        {reveal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0f0a05]/95 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="max-w-md w-full text-center my-8">
              <div className="text-7xl mb-4 animate-float">{reveal.chestIcon ?? '🎁'}</div>
              <h2 className="text-3xl font-black text-yellow-300 mb-1">{reveal.chestName} ouvert !</h2>
              <p className="text-white/40 text-sm mb-6">Tu as obtenu :</p>
              <div className="space-y-3">
                {(reveal.loot ?? []).map((l, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.25, type: 'spring', stiffness: 260, damping: 18 }}
                    className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/40 rounded-2xl p-4 flex items-center gap-4">
                    <span className="text-3xl">{l.icon ?? '📦'}</span>
                    <div className="text-left">
                      <p className="font-extrabold text-yellow-200">{l.name}</p>
                      <p className="text-xs text-white/40">{l.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => setReveal(null)} className="mt-6 w-full py-4 bg-yellow-500 text-[#1a1308] font-extrabold rounded-2xl uppercase tracking-wide">
                Récupérer et continuer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}