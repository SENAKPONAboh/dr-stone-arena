'use client';

import Coin from '@/components/ui/Coin';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  TITLES, FRAMES, THEMES, RARITY_STYLES, getTitleDef, getFrameDef, getThemeDef, type Rarity,
} from '@/lib/personnalisation-data';
import GoldAvatar from '@/components/ui/GoldAvatar';
import TitleBadge from '@/components/ui/TitleBadge';
import ThemeBackdrop from '@/components/ui/ThemeBackdrop';

type ShopItem = {
  id: string; name: string; category: string; priceUA: number;
  icon: string | null; description: string | null; effectKey: string | null;
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

type PreviewUser = { initials: string; imageUrl: string | null; name: string };
type TryOn = { frame?: string | null; title?: string | null; theme?: string | null };

const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff'];
const RARE_CONFETTI = ['#c084fc', '#f0abfc', '#fde68a', '#ffffff'];

const CATEGORIES = [
  { key: 'COFFRE', label: 'Coffres', icon: '🎁' },
  { key: 'CADRE', label: 'Cadres', icon: '🖼️' },
  { key: 'THEME', label: 'Thèmes', icon: '🎨' },
  { key: 'TITRE', label: 'Titres', icon: '🏷️' },
  { key: 'FLAMME', label: 'Flamme', icon: '🔥' },
  { key: 'RUSH', label: 'Rush', icon: '⚡' },
];

const PERSO_CATEGORIES = ['TITRE', 'CADRE', 'THEME'];
const CATEGORY_NOUN: Record<string, string> = { TITRE: 'titre', CADRE: 'cadre', THEME: 'thème' };

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: Math.min(i, 8) * 0.06, duration: 0.45, ease: 'easeOut' },
  }),
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const rarityOf = (item: { category: string; effectKey: string | null }): Rarity | undefined => {
  if (item.category === 'TITRE') return TITLES.find(t => t.key === item.effectKey)?.rarity;
  if (item.category === 'CADRE') return FRAMES.find(f => f.key === item.effectKey)?.rarity;
  if (item.category === 'THEME') return THEMES.find(t => t.key === item.effectKey)?.rarity;
  return undefined;
};

const cardFx = (r?: Rarity) =>
  r === 'LEGENDAIRE' || r === 'EXCLUSIF' ? 'fx-card fx-card--legend'
  : r === 'EPIC' ? 'fx-card fx-card--epic'
  : r === 'RARE' ? 'fx-card fx-card--rare'
  : 'fx-card border border-yellow-500/20';

// ===== Aperçu visuel d'un objet (cadre animé, mini-thème, titre) =====
function ItemPreview({ item, user }: { item: { category: string; effectKey: string | null; icon: string | null }; user: PreviewUser }) {
  if (item.category === 'CADRE') {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl bg-black/30">
        <GoldAvatar key={item.effectKey} imageUrl={user.imageUrl} initials={user.initials} frameKey={item.effectKey} size={58} />
      </div>
    );
  }
  if (item.category === 'THEME') {
    const t = getThemeDef(item.effectKey);
    if (!t) return null;
    return (
      <div className="relative h-28 overflow-hidden rounded-2xl" style={{ backgroundImage: t.bg }}>
        <ThemeBackdrop themeKey={t.key} compact />
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="rounded-xl px-4 py-2 text-center text-xs font-extrabold" style={{ background: t.cardBg, border: `1px solid ${t.borderColor}`, color: t.accent }}>
            {t.icon} {user.name}
          </div>
        </div>
      </div>
    );
  }
  if (item.category === 'TITRE') {
    const t = getTitleDef(item.effectKey);
    if (!t) return null;
    return (
      <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-black/30">
        <span className="text-xs font-bold text-white/60">{user.name}</span>
        <TitleBadge title={t} />
      </div>
    );
  }
  return (
    <div className="flex h-28 items-center justify-center rounded-2xl bg-black/20">
      <span className="animate-float text-6xl drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]">{item.icon ?? '📦'}</span>
    </div>
  );
}

export default function BoutiqueClient({
  items, inventory, uaBalance, flameProtectedUntil, flameLostAt, lostStreak, equipped, previewUser,
}: {
  items: ShopItem[]; inventory: InventoryItem[]; uaBalance: number;
  flameProtectedUntil?: string | null; flameLostAt?: string | null; lostStreak?: number;
  equipped?: { title: string | null; frame: string | null; theme: string | null };
  previewUser?: PreviewUser;
}) {
  const user: PreviewUser = previewUser ?? { initials: 'DR', imageUrl: null, name: 'Toi' };
  const [balance, setBalance] = useState(uaBalance);
  const [stock, setStock] = useState<InventoryItem[]>(inventory);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [reveal, setReveal] = useState<PurchaseResult | null>(null);
  const [chestStage, setChestStage] = useState<'shake' | 'open'>('shake');
  const [unlocked, setUnlocked] = useState<ShopItem | null>(null);
  const [tryOn, setTryOn] = useState<TryOn>({});

  const [protectionUntil, setProtectionUntil] = useState(flameProtectedUntil ?? null);
  const [lostFlameAt, setLostFlameAt] = useState(flameLostAt ?? null);
  const [lostStreakValue, setLostStreakValue] = useState(lostStreak ?? 0);
  const [equippedState, setEquippedState] = useState(equipped ?? { title: null, frame: null, theme: null });

  const protectionActive = !!protectionUntil && new Date(protectionUntil) > new Date();
  const restorable = !!lostFlameAt && lostStreakValue > 0 &&
    Date.now() - new Date(lostFlameAt).getTime() < 48 * 3600 * 1000;

  const stockOf = (itemId: string) => stock.find(s => s.itemId === itemId)?.quantity ?? 0;

  // Coffre : on secoue d'abord, puis il s'ouvre
  useEffect(() => {
    if (!reveal) return;
    setChestStage('shake');
    const t = setTimeout(() => {
      setChestStage('open');
      const end = Date.now() + 1600;
      const interval = setInterval(() => {
        if (Date.now() > end) { clearInterval(interval); return; }
        confetti({ particleCount: 50, spread: 70, startVelocity: 38, origin: { x: Math.random(), y: Math.random() * 0.35 }, colors: GOLD_CONFETTI, disableForReducedMotion: true });
      }, 350);
    }, 1300);
    return () => clearTimeout(t);
  }, [reveal]);

  const incrementStock = (item: { itemId: string; name: string; icon: string | null; category?: string; effectKey?: string | null }) => {
    setStock(prev => {
      const found = prev.find(s => s.itemId === item.itemId);
      if (found) return prev.map(s => (s.itemId === item.itemId ? { ...s, quantity: s.quantity + 1 } : s));
      return [...prev, { itemId: item.itemId, name: item.name, icon: item.icon, quantity: 1, category: item.category ?? 'FLAMME', effectKey: item.effectKey ?? null }];
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
        (data.loot as LootItem[]).forEach(l => incrementStock(l));
        setReveal(data);
      } else if (PERSO_CATEGORIES.includes(item.category)) {
        incrementStock({ itemId: item.id, name: item.name, icon: item.icon, category: item.category, effectKey: item.effectKey });
        setUnlocked(item);
        const r = rarityOf(item);
        confetti({ particleCount: r === 'LEGENDAIRE' ? 160 : 90, spread: 80, origin: { y: 0.6 }, colors: r === 'EPIC' || r === 'LEGENDAIRE' ? RARE_CONFETTI : GOLD_CONFETTI, disableForReducedMotion: true });
      } else {
        incrementStock({ itemId: item.id, name: item.name, icon: item.icon, category: item.category, effectKey: item.effectKey });
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.75 }, colors: GOLD_CONFETTI, disableForReducedMotion: true });
        setFlash(`✅ ${data.itemName} ajouté à ton inventaire`);
        setTimeout(() => setFlash(''), 3500);
      }
    } catch {
      setError('Impossible de joindre le serveur. Réessaie.');
    } finally {
      setLoadingId(null);
    }
  };

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
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.75 }, colors: GOLD_CONFETTI, disableForReducedMotion: true });
      setTimeout(() => setFlash(''), 4500);
    } catch {
      setError('Impossible de joindre le serveur. Réessaie.');
    } finally {
      setLoadingId(null);
    }
  };

  // ===== ÉQUIPER / RETIRER (personnalisation — permanent, jamais consommé) =====
  const toggleEquip = async (item: { itemId: string; name: string; category: string }, equip: boolean, ask = true) => {
    if (ask && !confirm(equip ? `Équiper « ${item.name} » ?` : `Retirer « ${item.name} » ?`)) return;
    setLoadingId(item.itemId);
    setError('');
    setFlash('');
    try {
      const res = await fetch('/api/monetise/personnalisation/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.itemId, action: equip ? 'EQUIP' : 'UNEQUIP' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); return; }
      const field = item.category === 'TITRE' ? 'title' : item.category === 'CADRE' ? 'frame' : 'theme';
      setEquippedState(prev => ({ ...prev, [field]: data.equipped }));
      setTryOn(prev => ({ ...prev, [field]: undefined }));
      setFlash(equip ? `✨ ${item.name} équipé ! Va voir ton profil.` : `${item.name} retiré.`);
      if (equip) confetti({ particleCount: 30, spread: 55, origin: { y: 0.7 }, colors: GOLD_CONFETTI, disableForReducedMotion: true });
      setTimeout(() => setFlash(''), 3500);
    } catch {
      setError('Impossible de joindre le serveur. Réessaie.');
    } finally {
      setLoadingId(null);
    }
  };

  const equippedKeyOf = (item: InventoryItem): string | null => {
    if (item.category === 'TITRE') return equippedState.title;
    if (item.category === 'CADRE') return equippedState.frame;
    if (item.category === 'THEME') return equippedState.theme;
    return null;
  };

  // Essayer un objet SANS l'acheter (aperçu seulement, rien n'est enregistré)
  const tryItem = (item: ShopItem) => {
    const field = item.category === 'TITRE' ? 'title' : item.category === 'CADRE' ? 'frame' : 'theme';
    setTryOn(prev => ({ ...prev, [field]: item.effectKey }));
    // Sur mobile l'aperçu est au-dessus du catalogue : on y remonte. Sur PC il reste visible à côté.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.getElementById('apercu-profil')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const shownFrame = tryOn.frame ?? equippedState.frame;
  const shownTitle = tryOn.title ?? equippedState.title;
  const shownTheme = tryOn.theme ?? equippedState.theme;
  const isTrying = !!(tryOn.frame || tryOn.title || tryOn.theme);
  const themeShown = getThemeDef(shownTheme);
  const titleShown = getTitleDef(shownTitle);

  let cardIndex = 0;

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white">🏪 Boutique de l'Arène</h1>
          <p className="text-xs text-white/40 mt-1">Objets · Coffres · Personnalisation — jamais d'UA retirable dans les coffres</p>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-white/5 border-2 border-yellow-500/30 text-yellow-300 font-extrabold animate-glow-gold whitespace-nowrap">
          <Coin /> {balance.toLocaleString('fr-FR')} UA
        </div>
      </div>

      {/* Sur PC : aperçu fixe à gauche, catalogue à droite. Sur mobile : l'un sous l'autre. */}
      <div className="space-y-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <aside className="lg:sticky lg:top-4">
      {/* ===== APERÇU EN DIRECT DE TON PROFIL ===== */}
      <div id="apercu-profil" className="relative overflow-hidden rounded-3xl border-2 border-yellow-500/30"
        style={{ backgroundImage: themeShown ? getThemeDef(shownTheme)!.bg : 'linear-gradient(135deg,#1a1308,#0f0a05)' }}>
        {themeShown && <ThemeBackdrop key={themeShown.key} themeKey={themeShown.key} compact />}
        <div className="relative z-10 flex flex-col items-center gap-3 px-4 py-7 text-center lg:py-10">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-yellow-300/80">
            {isTrying ? '👀 Essai en cours — rien n\'est acheté' : 'Ton profil en direct'}
          </p>
          <GoldAvatar key={shownFrame ?? 'none'} imageUrl={user.imageUrl} initials={user.initials} passActive frameKey={shownFrame} size={84} />
          <p className="text-lg font-extrabold text-white">{user.name}</p>
          {titleShown ? <TitleBadge title={titleShown} /> : <span className="text-xs text-white/40">Aucun titre équipé</span>}
          {isTrying && (
            <button onClick={() => setTryOn({})} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 hover:bg-white/20">
              Arrêter l'essai
            </button>
          )}
        </div>
      </div>

      </aside>

      <div className="min-w-0 space-y-6">
      {error && (
        <div className="bg-red-400/10 border-2 border-red-400/30 text-red-300 px-4 py-3 rounded-2xl text-sm font-bold text-center">{error}</div>
      )}
      {flash && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-green-400/10 border-2 border-green-400/30 text-green-300 px-4 py-3 rounded-2xl text-sm font-bold text-center">{flash}</motion.div>
      )}

      {/* Raccourcis de catégories */}
      <div className="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto bg-black/60 px-1 py-2 backdrop-blur">
        {CATEGORIES.filter(c => items.some(i => i.category === c.key)).map(c => (
          <a key={c.key} href={`#cat-${c.key}`} className="whitespace-nowrap rounded-full border border-yellow-500/30 bg-white/5 px-4 py-1.5 text-xs font-extrabold text-yellow-200 hover:bg-yellow-500/20">
            {c.icon} {c.label}
          </a>
        ))}
      </div>

      {CATEGORIES.map(cat => {
        const catItems = items.filter(i => i.category === cat.key);
        if (catItems.length === 0) return null;
        const perso = PERSO_CATEGORIES.includes(cat.key);
        return (
          <div key={cat.key} id={`cat-${cat.key}`} className="space-y-3 scroll-mt-14">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-white/70">{cat.icon} {cat.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catItems.map(item => {
                const i = cardIndex++;
                const affordable = balance >= item.priceUA;
                const isChest = item.category === 'COFFRE';
                const rarity = rarityOf(item);
                const owned = perso && stockOf(item.id) > 0;
                return (
                  <motion.div key={item.id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                    className={`${cardFx(rarity)} bg-white/5 p-4 flex flex-col gap-3`}>
                    <div className="relative z-10">
                      <ItemPreview item={item} user={user} />
                    </div>
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <p className="font-extrabold text-white">{item.name}</p>
                      {rarity && (
                        <span className={`shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-full ${RARITY_STYLES[rarity].cls}`}>{RARITY_STYLES[rarity].label}</span>
                      )}
                      {!perso && stockOf(item.id) > 0 && !isChest && (
                        <span className="shrink-0 text-[10px] font-extrabold bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">×{stockOf(item.id)}</span>
                      )}
                    </div>
                    <p className="relative z-10 -mt-1 text-xs text-white/40 leading-relaxed">{item.description}</p>
                    <div className="relative z-10 mt-auto flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-yellow-300"><Coin /> {item.priceUA.toLocaleString('fr-FR')}</p>
                      <div className="flex items-center gap-2">
                        {perso && (
                          <button onClick={() => tryItem(item)}
                            className="rounded-2xl border border-yellow-500/40 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-yellow-200 hover:bg-yellow-500/15">
                            👁 Essayer
                          </button>
                        )}
                        <motion.button
                          onClick={() => buy(item)}
                          disabled={loadingId === item.id || !affordable || owned}
                          whileHover={affordable && !owned ? { scale: 1.04 } : undefined}
                          whileTap={affordable && !owned ? { scale: 0.96 } : undefined}
                          className={`py-2 px-4 rounded-2xl font-extrabold text-xs uppercase tracking-wide whitespace-nowrap ${owned
                            ? 'bg-green-500/15 text-green-300'
                            : !affordable
                              ? 'bg-white/5 text-white/30 cursor-not-allowed'
                              : isChest
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-[#1a1308]'
                                : 'bg-yellow-500 text-[#1a1308]'}`}
                        >
                          {loadingId === item.id ? '⏳...' : owned ? '✓ Possédé' : !affordable ? 'Solde insuffisant' : isChest ? 'Ouvrir' : 'Acheter'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      </div>
      </div>

      {/* Inventaire */}
      <div className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6">
        <h2 className="font-extrabold text-white mb-2">🎒 Ton inventaire</h2>
        <p className="text-xs text-white/40 mb-4">
          <span className="text-yellow-300/70 font-bold">Objets</span> : achat ≠ activation, consommés quand TU le décides ·
          <span className="text-yellow-300/70 font-bold"> Personnalisation</span> : permanente, équipe à volonté.
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
              const isPerso = PERSO_CATEGORIES.includes(s.category);
              const isEquipped = isPerso && equippedKeyOf(s) === s.effectKey;
              const blockedByProtection =
                (s.effectKey === 'GEL_FLAMME' || s.effectKey === 'ASSURANCE_FLAMME') && protectionActive;
              const restaureBlocked = s.effectKey === 'RESTAURE_FLAMME' && !restorable;
              const disabled = loadingId === s.itemId || blockedByProtection || restaureBlocked;
              return (
                <motion.div key={s.itemId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl p-3 flex items-center gap-3 ${isEquipped ? 'bg-green-500/10 border border-green-400/30' : 'bg-white/5'}`}>
                  <span className="text-2xl">{s.icon ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/80 truncate">{s.name}</p>
                    {s.category === 'RUSH' && (
                      <p className="text-[10px] text-white/30">⚔️ S'utilise dans le Rush</p>
                    )}
                    {isEquipped && (
                      <p className="text-[10px] text-green-300 font-bold">✓ Équipé</p>
                    )}
                  </div>
                  {!isPerso && <span className="text-xs font-extrabold text-yellow-300">×{s.quantity}</span>}
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
                  {isPerso && (
                    <button
                      onClick={() => toggleEquip(s, !isEquipped)}
                      disabled={loadingId === s.itemId}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold uppercase whitespace-nowrap ${isEquipped
                        ? 'bg-green-500/20 text-green-300 border border-green-400/40'
                        : 'bg-yellow-500 text-[#1a1308] hover:bg-yellow-400'} disabled:opacity-40`}
                    >
                      {loadingId === s.itemId ? '⏳' : isEquipped ? 'Retirer' : 'Équiper'}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== NOUVEL OBJET DÉBLOQUÉ (cadre / thème / titre) ===== */}
      <AnimatePresence>
        {unlocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0f0a05]/95 p-4">
            <div className="fx-rays" />
            <motion.div initial={{ scale: 0.6, y: 40, rotate: -4 }} animate={{ scale: 1, y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="relative my-8 w-full max-w-sm text-center">
              <p className="mb-1 font-display text-xs font-extrabold uppercase tracking-widest text-yellow-300">
                Nouveau {CATEGORY_NOUN[unlocked.category]} débloqué
              </p>
              <h2 className="mb-5 font-display text-2xl font-black text-white">{unlocked.name}</h2>
              <div className="mx-auto mb-6 max-w-xs">
                <ItemPreview item={unlocked} user={user} />
              </div>
              {(() => { const r = rarityOf(unlocked); return r ? (
                <span className={`mb-5 inline-block rounded-full px-3 py-1 text-xs font-extrabold ${RARITY_STYLES[r].cls}`}>{RARITY_STYLES[r].label}</span>
              ) : null; })()}
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    const it = unlocked;
                    setUnlocked(null);
                    await toggleEquip({ itemId: it.id, name: it.name, category: it.category }, true, false);
                  }}
                  className="w-full rounded-2xl bg-yellow-500 py-4 font-display text-sm font-extrabold uppercase tracking-wide text-[#1a1308]"
                >
                  ✨ Équiper maintenant
                </button>
                <button onClick={() => setUnlocked(null)} className="w-full py-2 text-sm font-bold text-white/50">Plus tard</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== OUVERTURE DE COFFRE : il tremble, puis explose de lumière ===== */}
      <AnimatePresence>
        {reveal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0f0a05]/95 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fx-rays" style={{ opacity: chestStage === 'open' ? 0.55 : 0.2 }} />
            {chestStage === 'shake' ? (
              <div className="relative text-center">
                <div className="text-9xl" style={{ animation: 'fxChestShake 1.2s ease-in-out forwards', filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.8))' }}>
                  {reveal.chestIcon ?? '🎁'}
                </div>
                <p className="mt-6 animate-pulse font-display text-sm font-extrabold uppercase tracking-widest text-yellow-300">Ouverture…</p>
              </div>
            ) : (
              <>
                <motion.div initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} className="pointer-events-none fixed inset-0 bg-white" />
                <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} className="relative max-w-md w-full text-center my-8">
                  <motion.div initial={{ scale: 1.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} className="text-7xl mb-4 animate-float">{reveal.chestIcon ?? '🎁'}</motion.div>
                  <h2 className="font-display text-2xl font-black text-yellow-300 mb-1">{reveal.chestName} ouvert !</h2>
                  <p className="text-white/40 text-sm mb-6">Tu as obtenu :</p>
                  <div className="space-y-3">
                    {(reveal.loot ?? []).map((l, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 30, scale: 0.8, rotateX: 70 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                        transition={{ delay: 0.35 + i * 0.35, type: 'spring', stiffness: 260, damping: 16 }}
                        className="fx-card fx-card--legend bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-4 flex items-center gap-4">
                        <span className="relative z-10 text-4xl">{l.icon ?? '📦'}</span>
                        <div className="relative z-10 text-left">
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
