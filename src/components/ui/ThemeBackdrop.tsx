'use client';

import { useReducedMotion } from 'framer-motion';
import { getThemeDef } from '@/lib/personnalisation-data';

// Ambiance d'un thème de profil : halos + particules génériques + EFFET SIGNATURE propre à chaque thème.
// compact = aperçu dans une carte (boutique) : contenu dans sa boîte, moins d'éléments.
// Positions calculées à partir de l'index (aucun hasard) : rendu identique serveur / navigateur.

const pos = (i: number, a: number, b: number, mod = 100) => (i * a + b) % mod;

export default function ThemeBackdrop({ themeKey, compact = false }: { themeKey: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  const theme = getThemeDef(themeKey);
  if (!theme) return null;

  const n = (full: number) => (compact ? Math.max(6, Math.round(full / 2)) : full);
  const kf = (name: string) => (compact ? `${name}C` : name); // versions en pixels pour les petites cartes
  const root: React.CSSProperties = compact
    ? { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }
    : { position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 };
  const still = !!reduce; // mouvement réduit : décor figé (les couleurs restent)
  const anim = (value: string) => (still ? undefined : value);

  return (
    <div aria-hidden="true" style={root}>
      {/* Halos doux */}
      {!compact && (
        <>
          <div className="theme-orb" style={{ width: 440, height: 440, top: '5%', left: '2%', opacity: 0.45, background: `radial-gradient(circle, ${theme.particleColor}66 0%, transparent 70%)`, animation: anim('orbA 26s ease-in-out infinite') }} />
          <div className="theme-orb" style={{ width: 360, height: 360, top: '40%', left: '62%', opacity: 0.4, background: `radial-gradient(circle, ${theme.aura} 0%, transparent 70%)`, animation: anim('orbB 34s ease-in-out infinite') }} />
          <div className="theme-orb" style={{ width: 300, height: 300, top: '72%', left: '22%', opacity: 0.35, background: `radial-gradient(circle, ${theme.particleColor}44 0%, transparent 70%)`, animation: anim('orbC 24s ease-in-out infinite') }} />
        </>
      )}

      {/* Particules génériques de la couleur du thème */}
      {Array.from({ length: n(16) }).map((_, i) => (
        <span key={`p-${i}`} className="theme-particle" style={{
          top: `${pos(i, 43, 0)}%`, left: `${pos(i, 61, 7)}%`, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2,
          background: theme.particleColor, animationDelay: `${(i * -1.35 % 7).toFixed(1)}s`, animationDuration: `${6 + (i % 5) * 2}s`,
        }} />
      ))}

      {/* 🌊 OCÉAN : bulles qui montent */}
      {theme.fx === 'bubbles' && Array.from({ length: n(18) }).map((_, i) => (
        <span key={`b-${i}`} className="fx-layer" style={{
          left: `${pos(i, 37, 5)}%`, top: '100%', width: 6 + (i % 4) * 5, height: 6 + (i % 4) * 5, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.55)', background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(103,232,249,0.08))',
          animation: anim(`${kf('fxBubble')} ${9 + (i % 6) * 2}s linear ${-(i * 1.7)}s infinite`),
        }} />
      ))}

      {/* 🌋 BRAISE : braises géantes + lueur de lave */}
      {theme.fx === 'embers' && (
        <>
          <div className="fx-layer" style={{ left: 0, right: 0, bottom: 0, height: '35%', background: 'linear-gradient(to top, rgba(249,115,22,0.35), transparent)', animation: anim('logo-pulse 3s ease-in-out infinite') }} />
          {Array.from({ length: n(28) }).map((_, i) => (
            <span key={`e-${i}`} className="fx-layer" style={{
              left: `${pos(i, 29, 3)}%`, top: '100%', width: 2 + (i % 4), height: 2 + (i % 4), borderRadius: '50%',
              background: i % 3 === 0 ? '#fde047' : '#fb923c', boxShadow: '0 0 8px #f97316',
              animation: anim(`${kf('fxEmber')} ${5 + (i % 6) * 1.3}s ease-out ${-(i * 0.9)}s infinite`),
            }} />
          ))}
        </>
      )}

      {/* 🌲 SYLVESTRE : lucioles */}
      {theme.fx === 'fireflies' && Array.from({ length: n(22) }).map((_, i) => (
        <span key={`f-${i}`} className="fx-layer" style={{
          left: `${pos(i, 47, 9)}%`, top: `${pos(i, 31, 12)}%`, width: 4 + (i % 3), height: 4 + (i % 3), borderRadius: '50%',
          background: '#bef264', boxShadow: '0 0 12px 3px rgba(190,242,100,0.7)',
          animation: anim(`fxFirefly ${5 + (i % 5) * 1.5}s ease-in-out ${-(i * 0.7)}s infinite`),
        }} />
      ))}

      {/* 🌃 NÉON : grille synthwave qui défile + horizon */}
      {theme.fx === 'grid' && (
        <>
          <div className="fx-grid" style={still ? { animation: 'none' } : undefined} />
          <div className="fx-layer" style={{ left: 0, right: 0, top: '38%', height: 2, background: 'linear-gradient(90deg, transparent, #e879f9, #22d3ee, transparent)', boxShadow: '0 0 18px #e879f9' }} />
        </>
      )}

      {/* 👑 ROYAL : rayons dorés + étincelles */}
      {theme.fx === 'sparkles' && (
        <>
          {!compact && <div className="fx-rays" style={{ opacity: 0.18, animation: anim('fxRays 40s linear infinite') }} />}
          {Array.from({ length: n(22) }).map((_, i) => (
            <span key={`s-${i}`} className="fx-layer" style={{
              left: `${pos(i, 53, 6)}%`, top: `${pos(i, 37, 4)}%`, fontSize: 8 + (i % 4) * 4, color: i % 2 ? '#fde047' : '#e9d5ff', lineHeight: 1,
              animation: anim(`fxSpark ${2 + (i % 4) * 0.7}s ease-in-out ${-(i * 0.45)}s infinite`),
            }}>✦</span>
          ))}
        </>
      )}

      {/* ✨ COSMOS : nébuleuse, étoiles et étoiles filantes */}
      {theme.fx === 'cosmos' && (
        <>
          <div className="theme-orb" style={{ width: compact ? 200 : 520, height: compact ? 200 : 520, top: '15%', left: '55%', opacity: 0.5, background: 'radial-gradient(circle, #a78bfa55 0%, transparent 70%)', animation: anim('orbB 40s ease-in-out infinite') }} />
          {Array.from({ length: n(30) }).map((_, i) => (
            <span key={`c-${i}`} className="theme-star" style={{
              top: `${pos(i, 37, 11)}%`, left: `${pos(i, 53, 3)}%`, width: i % 5 === 0 ? 4 : 2, height: i % 5 === 0 ? 4 : 2,
              background: '#fff', boxShadow: '0 0 5px rgba(255,255,255,0.9)', animationDelay: `${(i * 0.41) % 2.5}s`, animationDuration: `${1.6 + (i % 3) * 0.9}s`,
            }} />
          ))}
          {!compact && (
            <>
              <div className="theme-shooting-star" style={{ top: 0, left: 0, animation: anim('shootAcross 9s linear infinite') }} />
              <div className="theme-shooting-star" style={{ top: 0, left: 0, animation: anim('shootAcrossB 14s linear 5s infinite') }} />
            </>
          )}
        </>
      )}

      {/* 🌌 AURORE BORÉALE : rubans de lumière qui ondulent */}
      {theme.fx === 'aurora' && (
        <>
          {[
            { top: '4%', c: 'rgba(52,211,153,0.65)', d: 11 },
            { top: '18%', c: 'rgba(56,189,248,0.55)', d: 15 },
            { top: '32%', c: 'rgba(167,139,250,0.5)', d: 19 },
          ].map((b, i) => (
            <div key={i} className="fx-layer" style={{
              left: '-20%', width: '140%', top: b.top, height: compact ? '30%' : '26%',
              background: `linear-gradient(90deg, transparent, ${b.c}, transparent)`, filter: 'blur(26px)',
              animation: anim(`fxAuroraBand ${b.d}s ease-in-out ${-i * 3}s infinite`),
            }} />
          ))}
          {Array.from({ length: n(18) }).map((_, i) => (
            <span key={`a-${i}`} className="theme-star" style={{ top: `${pos(i, 41, 6)}%`, left: `${pos(i, 59, 2)}%`, width: 2, height: 2, background: '#fff', animationDelay: `${(i * 0.37) % 2.4}s` }} />
          ))}
        </>
      )}

      {/* ⛈️ TEMPÊTE : pluie battante + éclairs qui illuminent l'écran */}
      {theme.fx === 'storm' && (
        <>
          {Array.from({ length: n(46) }).map((_, i) => (
            <span key={`r-${i}`} className="fx-layer" style={{
              left: `${pos(i, 23, 4)}%`, top: 0, width: 1.5, height: 18 + (i % 4) * 8, background: 'linear-gradient(to bottom, transparent, rgba(191,219,254,0.75))',
              animation: anim(`${kf('fxRain')} ${0.9 + (i % 5) * 0.25}s linear ${-(i * 0.13)}s infinite`),
            }} />
          ))}
          <div className="fx-layer" style={{ inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(219,234,254,0.9), rgba(147,197,253,0.25) 60%, transparent 85%)', animation: anim('fxLightning 7s linear infinite') }} />
          <div className="fx-layer" style={{ inset: 0, background: 'radial-gradient(circle at 20% 10%, rgba(219,234,254,0.8), transparent 60%)', animation: anim('fxLightning 11s linear 3.5s infinite') }} />
        </>
      )}

      {/* 🌸 SAKURA : pétales qui tombent */}
      {theme.fx === 'petals' && Array.from({ length: n(24) }).map((_, i) => (
        <span key={`pt-${i}`} className="fx-layer" style={{
          left: `${20 + pos(i, 37, 5, 100)}%`, top: 0, width: 9 + (i % 3) * 3, height: 7 + (i % 3) * 2, borderRadius: '100% 0 100% 0',
          background: i % 2 ? '#f9a8d4' : '#fbcfe8', opacity: 0.9,
          animation: anim(`${kf('fxPetal')} ${9 + (i % 7) * 1.6}s linear ${-(i * 1.3)}s infinite`),
        }} />
      ))}
    </div>
  );
}
