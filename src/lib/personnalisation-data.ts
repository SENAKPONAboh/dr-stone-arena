// ===== PERSONNALISATION — DONNÉES (module PUR : aucun import serveur) =====
// ⚠️ Les thèmes utilisent du CSS INLINE (pas de classes Tailwind) :
// rendu garanti identique sur PC, mobile et tous les navigateurs.

export type Rarity = 'COMMUN' | 'RARE' | 'EPIC' | 'LEGENDAIRE' | 'EXCLUSIF';

export const RARITY_STYLES: Record<Rarity, { label: string; cls: string }> = {
  COMMUN: { label: 'Commun', cls: 'bg-gray-500/20 text-gray-300' },
  RARE: { label: 'Rare', cls: 'bg-blue-500/20 text-blue-300' },
  EPIC: { label: 'Épique', cls: 'bg-purple-500/20 text-purple-300' },
  LEGENDAIRE: { label: 'Légendaire', cls: 'bg-amber-500/20 text-amber-300' },
  EXCLUSIF: { label: 'Exclusif', cls: 'bg-red-500/20 text-red-300' },
};

// 🏷️ TITRES
export const TITLES: { key: string; name: string; icon: string; rarity: Rarity; priceUA: number }[] = [
  { key: 'TITRE_ETUDIANT_PROMETTEUR', name: "L'Étudiant Prometteur", icon: '🌱', rarity: 'COMMUN', priceUA: 20000 },
  { key: 'TITRE_CLINICIEN', name: 'Le Clinicien', icon: '🔬', rarity: 'COMMUN', priceUA: 20000 },
  { key: 'TITRE_MEDECIN_DEVENIR', name: 'Le Médecin en Devenir', icon: '⚕️', rarity: 'COMMUN', priceUA: 20000 },
  { key: 'TITRE_PRECIS', name: 'Le Précis', icon: '🎯', rarity: 'COMMUN', priceUA: 20000 },
  { key: 'TITRE_ETOILE_MONTE', name: "L'Étoile Montante", icon: '⭐', rarity: 'RARE', priceUA: 35000 },
  { key: 'TITRE_ESPRIT_CLINIQUE', name: "L'Esprit Clinique", icon: '🧠', rarity: 'RARE', priceUA: 35000 },
  { key: 'TITRE_INFATIGABLE', name: "L'Infatigable", icon: '🔥', rarity: 'RARE', priceUA: 35000 },
  { key: 'TITRE_CHAMPION', name: 'Champion Arena', icon: '🏆', rarity: 'RARE', priceUA: 35000 },
  { key: 'TITRE_ECLAIR', name: "L'Éclair Médical", icon: '⚡', rarity: 'RARE', priceUA: 35000 },
  { key: 'TITRE_STRATEGE', name: "Le Stratège de l'Arène", icon: '🧩', rarity: 'EPIC', priceUA: 50000 },
  { key: 'TITRE_MAITRE_DIAGNOSTIC', name: 'Le Maître du Diagnostic', icon: '🩺', rarity: 'EPIC', priceUA: 50000 },
  { key: 'TITRE_MAITRE_ARENE', name: "Le Maître de l'Arène", icon: '👑', rarity: 'EPIC', priceUA: 50000 },
  { key: 'TITRE_ELITE', name: "L'Élite Médicale", icon: '💎', rarity: 'EPIC', priceUA: 50000 },
  { key: 'TITRE_MONSTRE', name: 'Le Monstre Clinique', icon: '🐉', rarity: 'EPIC', priceUA: 50000 },
  { key: 'TITRE_RAISONNEMENT', name: 'Le Maître du Raisonnement', icon: '🩸', rarity: 'EPIC', priceUA: 50000 },
  { key: 'TITRE_PRODIGE', name: 'Le Prodige', icon: '🌠', rarity: 'LEGENDAIRE', priceUA: 90000 },
  { key: 'TITRE_IMMORTEL', name: "L'Immortel du Diagnostic", icon: '♾️', rarity: 'LEGENDAIRE', priceUA: 120000 },
  { key: 'TITRE_SOUVERAIN', name: "Le Souverain de l'Arène", icon: '🏛️', rarity: 'LEGENDAIRE', priceUA: 150000 },
  { key: 'TITRE_LEGENDE_ARENE', name: "Légende de l'Arène", icon: '👑', rarity: 'EXCLUSIF', priceUA: 0 },
];

// 🖼️ CADRES (déjà en CSS inline — inchangés)
export type FrameEffect = 'fire' | 'ice' | 'neon' | 'galaxy' | 'rainbow' | 'orbit' | 'lightning' | 'aurora' | 'royal' | 'phoenix';

export type FrameDef = {
  key: string; name: string; icon: string; rarity: Rarity; priceUA: number;
  effect: FrameEffect;
  gradient: string;
  glow: [string, string, string];
  duration: number;
  particleColor: string;
};

export const FRAMES: FrameDef[] = [
  { key: 'CADRE_EMERAUDE', name: 'Cadre Émeraude', icon: '💚', rarity: 'COMMUN', priceUA: 30000,
    effect: 'orbit', particleColor: '#34d399',
    gradient: 'conic-gradient(from 0deg, #065f46, #10b981, #a7f3d0, #ffffff, #a7f3d0, #10b981, #065f46)',
    glow: ['0 0 8px rgba(16,185,129,0.5)', '0 0 20px rgba(16,185,129,0.9)', '0 0 8px rgba(16,185,129,0.5)'], duration: 4 },
  { key: 'CADRE_AZUR', name: 'Cadre Azur', icon: '💙', rarity: 'COMMUN', priceUA: 30000,
    effect: 'orbit', particleColor: '#60a5fa',
    gradient: 'conic-gradient(from 0deg, #1e3a8a, #3b82f6, #bfdbfe, #ffffff, #bfdbfe, #3b82f6, #1e3a8a)',
    glow: ['0 0 8px rgba(59,130,246,0.5)', '0 0 20px rgba(59,130,246,0.9)', '0 0 8px rgba(59,130,246,0.5)'], duration: 4 },
  { key: 'CADRE_AMETHYSTE', name: 'Cadre Améthyste', icon: '💜', rarity: 'COMMUN', priceUA: 30000,
    effect: 'orbit', particleColor: '#c084fc',
    gradient: 'conic-gradient(from 0deg, #581c87, #a855f7, #e9d5ff, #ffffff, #e9d5ff, #a855f7, #581c87)',
    glow: ['0 0 8px rgba(168,85,247,0.5)', '0 0 20px rgba(168,85,247,0.9)', '0 0 8px rgba(168,85,247,0.5)'], duration: 4 },
  { key: 'CADRE_FEU', name: 'Cadre de Feu', icon: '🔥', rarity: 'RARE', priceUA: 50000,
    effect: 'fire', particleColor: '#fb923c',
    gradient: 'conic-gradient(from 0deg, #7f1d1d, #ef4444, #fdba74, #fff7ed, #fdba74, #ef4444, #7f1d1d)',
    glow: ['0 0 10px rgba(239,68,68,0.55)', '0 0 26px rgba(249,115,22,0.95)', '0 0 10px rgba(239,68,68,0.55)'], duration: 2.5 },
  { key: 'CADRE_GLACE', name: 'Cadre de Glace', icon: '❄️', rarity: 'RARE', priceUA: 50000,
    effect: 'ice', particleColor: '#e0f2fe',
    gradient: 'conic-gradient(from 0deg, #0c4a6e, #38bdf8, #e0f2fe, #ffffff, #e0f2fe, #38bdf8, #0c4a6e)',
    glow: ['0 0 8px rgba(56,189,248,0.5)', '0 0 20px rgba(56,189,248,0.9)', '0 0 8px rgba(56,189,248,0.5)'], duration: 4.5 },
  { key: 'CADRE_NEON', name: 'Cadre Néon', icon: '🌟', rarity: 'RARE', priceUA: 50000,
    effect: 'neon', particleColor: '#e879f9',
    gradient: 'conic-gradient(from 0deg, #0891b2, #e879f9, #22d3ee, #f0abfc, #22d3ee, #e879f9, #0891b2)',
    glow: ['0 0 8px rgba(232,121,249,0.55)', '0 0 22px rgba(34,211,238,0.9)', '0 0 8px rgba(232,121,249,0.55)'], duration: 3 },
  { key: 'CADRE_ARC_EN_CIEL', name: 'Cadre Arc-en-Ciel', icon: '🌈', rarity: 'EPIC', priceUA: 80000,
    effect: 'rainbow', particleColor: '#ffffff',
    gradient: 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
    glow: ['0 0 10px rgba(255,255,255,0.55)', '0 0 24px rgba(255,255,255,0.95)', '0 0 10px rgba(255,255,255,0.55)'], duration: 3.5 },
  { key: 'CADRE_GALAXIE', name: 'Cadre Galaxie', icon: '🌌', rarity: 'EPIC', priceUA: 80000,
    effect: 'galaxy', particleColor: '#c4b5fd',
    gradient: 'conic-gradient(from 0deg, #1e1b4b, #4c1d95, #a78bfa, #ffffff, #a78bfa, #4c1d95, #1e1b4b)',
    glow: ['0 0 10px rgba(139,92,246,0.55)', '0 0 26px rgba(139,92,246,0.95)', '0 0 10px rgba(139,92,246,0.55)'], duration: 5.5 },
  { key: 'CADRE_FOUDRE', name: 'Cadre Foudre', icon: '⚡', rarity: 'EPIC', priceUA: 90000,
    effect: 'lightning', particleColor: '#fde047',
    gradient: 'conic-gradient(from 0deg, #1e3a8a, #38bdf8, #fef9c3, #ffffff, #fde047, #38bdf8, #1e3a8a)',
    glow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 28px rgba(56,189,248,0.95)', '0 0 10px rgba(253,224,71,0.5)'], duration: 1.8 },
  { key: 'CADRE_AURORE', name: 'Cadre Aurore', icon: '🌌', rarity: 'EPIC', priceUA: 90000,
    effect: 'aurora', particleColor: '#5eead4',
    gradient: 'conic-gradient(from 0deg, #0f766e, #34d399, #38bdf8, #a78bfa, #f0abfc, #34d399, #0f766e)',
    glow: ['0 0 12px rgba(52,211,153,0.5)', '0 0 30px rgba(167,139,250,0.9)', '0 0 12px rgba(52,211,153,0.5)'], duration: 6 },
  { key: 'CADRE_ROYAL', name: 'Cadre Royal', icon: '👑', rarity: 'LEGENDAIRE', priceUA: 150000,
    effect: 'royal', particleColor: '#fde047',
    gradient: 'conic-gradient(from 0deg, #78350f, #f59e0b, #fef3c7, #ffffff, #fde047, #f59e0b, #78350f)',
    glow: ['0 0 12px rgba(250,204,21,0.6)', '0 0 34px rgba(250,204,21,1)', '0 0 12px rgba(250,204,21,0.6)'], duration: 3 },
  { key: 'CADRE_PHENIX', name: 'Cadre Phénix', icon: '🔥', rarity: 'LEGENDAIRE', priceUA: 180000,
    effect: 'phoenix', particleColor: '#fb923c',
    gradient: 'conic-gradient(from 0deg, #7f1d1d, #dc2626, #f97316, #fde047, #fff7ed, #f97316, #7f1d1d)',
    glow: ['0 0 14px rgba(239,68,68,0.6)', '0 0 38px rgba(249,115,22,1)', '0 0 14px rgba(239,68,68,0.6)'], duration: 2.2 },
];

// 🎨 THÈMES — VALEURS CSS INLINE (fix mobile)
export type ThemeFx = 'bubbles' | 'embers' | 'fireflies' | 'grid' | 'sparkles' | 'cosmos' | 'aurora' | 'storm' | 'petals';

export type ThemeDef = {
  fx: ThemeFx;         // effet signature plein écran
  key: string; name: string; icon: string; rarity: Rarity; priceUA: number;
  bg: string;          // gradient CSS (style inline)
  cardBg: string;      // rgba (style inline)
  borderColor: string; // rgba
  accent: string;      // hex
  badgeBg: string;     // rgba
  badgeText: string;   // hex
  particleColor: string;
  aura: string;
};

export const THEMES: ThemeDef[] = [
  { key: 'THEME_OCEAN', fx: 'bubbles', name: 'Thème Océan', icon: '🌊', rarity: 'RARE', priceUA: 50000,
    bg: 'linear-gradient(135deg, #020617 0%, #172554 45%, #083344 100%)',
    cardBg: 'rgba(2,6,23,0.82)', borderColor: 'rgba(34,211,238,0.45)',
    accent: '#67e8f9', badgeBg: 'rgba(34,211,238,0.18)', badgeText: '#67e8f9',
    particleColor: '#22d3ee', aura: 'rgba(34,211,238,0.4)' },
  { key: 'THEME_BRAISE', fx: 'embers', name: 'Thème Braise', icon: '🌋', rarity: 'RARE', priceUA: 50000,
    bg: 'linear-gradient(135deg, #1a0505 0%, #450a0a 45%, #431407 100%)',
    cardBg: 'rgba(20,5,5,0.82)', borderColor: 'rgba(251,146,60,0.45)',
    accent: '#fdba74', badgeBg: 'rgba(251,146,60,0.18)', badgeText: '#fdba74',
    particleColor: '#fb923c', aura: 'rgba(251,146,60,0.4)' },
  { key: 'THEME_SYLVESTRE', fx: 'fireflies', name: 'Thème Sylvestre', icon: '🌲', rarity: 'RARE', priceUA: 50000,
    bg: 'linear-gradient(135deg, #04120a 0%, #022c22 45%, #052e16 100%)',
    cardBg: 'rgba(4,18,10,0.82)', borderColor: 'rgba(52,211,153,0.45)',
    accent: '#6ee7b7', badgeBg: 'rgba(52,211,153,0.18)', badgeText: '#6ee7b7',
    particleColor: '#34d399', aura: 'rgba(52,211,153,0.4)' },
  { key: 'THEME_NEON', fx: 'grid', name: 'Thème Néon', icon: '🌃', rarity: 'EPIC', priceUA: 100000,
    bg: 'linear-gradient(135deg, #000000 0%, #12002b 50%, #001a1a 100%)',
    cardBg: 'rgba(13,0,32,0.85)', borderColor: 'rgba(232,121,249,0.55)',
    accent: '#f0abfc', badgeBg: 'rgba(232,121,249,0.2)', badgeText: '#f0abfc',
    particleColor: '#e879f9', aura: 'rgba(232,121,249,0.45)' },
  { key: 'THEME_ROYAL', fx: 'sparkles', name: 'Thème Royal', icon: '👑', rarity: 'EPIC', priceUA: 100000,
    bg: 'linear-gradient(135deg, #12061f 0%, #3b0764 50%, #1a1000 100%)',
    cardBg: 'rgba(18,6,31,0.82)', borderColor: 'rgba(250,204,21,0.5)',
    accent: '#fde047', badgeBg: 'rgba(168,85,247,0.2)', badgeText: '#d8b4fe',
    particleColor: '#facc15', aura: 'rgba(250,204,21,0.4)' },
  { key: 'THEME_COSMOS', fx: 'cosmos', name: 'Thème Cosmos', icon: '✨', rarity: 'LEGENDAIRE', priceUA: 150000,
    bg: 'linear-gradient(135deg, #000000 0%, #1e1b4b 45%, #2e1065 100%)',
    cardBg: 'rgba(10,10,30,0.85)', borderColor: 'rgba(167,139,250,0.55)',
    accent: '#c4b5fd', badgeBg: 'rgba(167,139,250,0.2)', badgeText: '#c4b5fd',
    particleColor: '#a78bfa', aura: 'rgba(167,139,250,0.5)' },
  { key: 'THEME_SAKURA', fx: 'petals', name: 'Thème Sakura', icon: '🌸', rarity: 'RARE', priceUA: 50000,
    bg: 'linear-gradient(135deg, #1f0a18 0%, #4a1230 50%, #2a0f2e 100%)',
    cardBg: 'rgba(31,10,24,0.82)', borderColor: 'rgba(244,114,182,0.5)',
    accent: '#f9a8d4', badgeBg: 'rgba(244,114,182,0.2)', badgeText: '#f9a8d4',
    particleColor: '#f472b6', aura: 'rgba(244,114,182,0.4)' },
  { key: 'THEME_TEMPETE', fx: 'storm', name: 'Thème Tempête', icon: '⛈️', rarity: 'EPIC', priceUA: 100000,
    bg: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
    cardBg: 'rgba(2,6,23,0.85)', borderColor: 'rgba(147,197,253,0.5)',
    accent: '#bfdbfe', badgeBg: 'rgba(96,165,250,0.2)', badgeText: '#bfdbfe',
    particleColor: '#93c5fd', aura: 'rgba(147,197,253,0.4)' },
  { key: 'THEME_AURORE', fx: 'aurora', name: 'Thème Aurore Boréale', icon: '🌌', rarity: 'LEGENDAIRE', priceUA: 170000,
    bg: 'linear-gradient(135deg, #021417 0%, #06302f 45%, #1b1147 100%)',
    cardBg: 'rgba(2,20,23,0.8)', borderColor: 'rgba(94,234,212,0.55)',
    accent: '#99f6e4', badgeBg: 'rgba(94,234,212,0.2)', badgeText: '#99f6e4',
    particleColor: '#5eead4', aura: 'rgba(94,234,212,0.5)' },
];

export const getTitleDef = (key?: string | null) => TITLES.find(t => t.key === key) ?? null;
export const getFrameDef = (key?: string | null) => FRAMES.find(f => f.key === key) ?? null;
export const getThemeDef = (key?: string | null) => THEMES.find(t => t.key === key) ?? null;