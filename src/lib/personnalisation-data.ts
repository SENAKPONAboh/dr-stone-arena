// ===== PERSONNALISATION — DONNÉES (module PUR : aucun import serveur) =====

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
  { key: 'TITRE_LEGENDE_ARENE', name: "Légende de l'Arène", icon: '👑', rarity: 'EXCLUSIF', priceUA: 0 },
];

// 🖼️ CADRES 2.0 — chaque cadre a maintenant un EFFET dédié
export type FrameEffect = 'fire' | 'ice' | 'neon' | 'galaxy' | 'rainbow' | 'orbit';

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
];

// 🎨 THÈMES 2.0 — fond animé + particules flottantes + halo qui respire
export type ThemeDef = {
  key: string; name: string; icon: string; rarity: Rarity; priceUA: number;
  bg: string; card: string; accent: string; badge: string;
  particleColor: string;
  aura: string;
};

export const THEMES: ThemeDef[] = [
  { key: 'THEME_OCEAN', name: 'Thème Océan', icon: '🌊', rarity: 'RARE', priceUA: 50000,
    bg: 'bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950',
    card: 'bg-blue-950/60 backdrop-blur-xl border-2 border-cyan-400/40 text-white',
    accent: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300',
    particleColor: '#22d3ee', aura: 'rgba(34,211,238,0.4)' },
  { key: 'THEME_BRAISE', name: 'Thème Braise', icon: '🌋', rarity: 'RARE', priceUA: 50000,
    bg: 'bg-gradient-to-br from-[#1a0505] via-red-950 to-orange-950',
    card: 'bg-red-950/60 backdrop-blur-xl border-2 border-orange-400/40 text-white',
    accent: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300',
    particleColor: '#fb923c', aura: 'rgba(251,146,60,0.4)' },
  { key: 'THEME_SYLVESTRE', name: 'Thème Sylvestre', icon: '🌲', rarity: 'RARE', priceUA: 50000,
    bg: 'bg-gradient-to-br from-[#04120a] via-emerald-950 to-green-950',
    card: 'bg-emerald-950/60 backdrop-blur-xl border-2 border-emerald-400/40 text-white',
    accent: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300',
    particleColor: '#34d399', aura: 'rgba(52,211,153,0.4)' },
  { key: 'THEME_NEON', name: 'Thème Néon', icon: '🌃', rarity: 'EPIC', priceUA: 100000,
    bg: 'bg-gradient-to-br from-black via-[#12002b] to-[#001a1a]',
    card: 'bg-[#0d0020]/70 backdrop-blur-xl border-2 border-fuchsia-400/50 text-white',
    accent: 'text-fuchsia-300', badge: 'bg-fuchsia-500/20 text-fuchsia-300',
    particleColor: '#e879f9', aura: 'rgba(232,121,249,0.45)' },
  { key: 'THEME_ROYAL', name: 'Thème Royal', icon: '👑', rarity: 'EPIC', priceUA: 100000,
    bg: 'bg-gradient-to-br from-[#12061f] via-purple-950 to-[#1a1000]',
    card: 'bg-purple-950/60 backdrop-blur-xl border-2 border-yellow-400/50 text-white',
    accent: 'text-yellow-300', badge: 'bg-purple-500/20 text-purple-300',
    particleColor: '#facc15', aura: 'rgba(250,204,21,0.4)' },
  { key: 'THEME_COSMOS', name: 'Thème Cosmos', icon: '✨', rarity: 'LEGENDAIRE', priceUA: 150000,
    bg: 'bg-gradient-to-br from-black via-indigo-950 to-violet-950',
    card: 'bg-indigo-950/60 backdrop-blur-xl border-2 border-violet-400/50 text-white',
    accent: 'text-violet-300', badge: 'bg-violet-500/20 text-violet-300',
    particleColor: '#a78bfa', aura: 'rgba(167,139,250,0.5)' },
];

export const getTitleDef = (key?: string | null) => TITLES.find(t => t.key === key) ?? null;
export const getFrameDef = (key?: string | null) => FRAMES.find(f => f.key === key) ?? null;
export const getThemeDef = (key?: string | null) => THEMES.find(t => t.key === key) ?? null;