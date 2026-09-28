import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getNiveauLabel } from '@/lib/niveau';
import { getPlanLabel } from '@/lib/premium';
import { getDuelGrade } from '@/lib/duel';
import ChallengeDuelButton from '@/components/duel/ChallengeDuelButton';
import GoldAvatar from '@/components/ui/GoldAvatar';
import { getCurrentUser } from '@/lib/auth';
import { getTitleDef, getThemeDef, RARITY_STYLES } from '@/lib/personnalisation-data';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profileUser = await prisma.user.findUnique({
    where: { id: (await params).id },
    select: {
      id: true, prenom: true, nom: true, pseudo: true, imageUrl: true,
      anneeEtude: true, xp: true, streak: true,
      isPremium: true, premiumTier: true, passActive: true,
      activeTitleId: true, activeFrameId: true, activeThemeId: true,
      duelsWon: true, duelsLost: true, pointsArena: true,
      badges: { include: { badge: true } }
    }
  });

  if (!profileUser) redirect('/etudiant');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { current: duelGrade } = getDuelGrade(profileUser.duelsWon);

  const titleDef = getTitleDef(profileUser.activeTitleId);
  const themeDef = getThemeDef(profileUser.activeThemeId);

  let grade = "🥉 Clinicien Bronze";
  if (profileUser.xp >= 1000) grade = "🥈 Clinicien Argent";
  if (profileUser.xp >= 3000) grade = "🥇 Clinicien Or";
  if (profileUser.xp >= 6000) grade = "💎 Expert Clinicien";

  // ===== STYLES : thème = CSS INLINE (fiable mobile + PC) =====
  const badgeProps = (prem: string, free: string) =>
    themeDef
      ? { className: 'px-3 py-1 rounded-full text-sm font-bold', style: { background: themeDef.badgeBg, color: themeDef.badgeText } as CSSProperties }
      : { className: `px-3 py-1 rounded-full text-sm font-bold ${profileUser.isPremium ? prem : free}`, style: undefined as CSSProperties | undefined };

  const cardInline: CSSProperties | undefined = themeDef
    ? {
        background: themeDef.cardBg,
        border: `2px solid ${themeDef.borderColor}`,
        color: '#ffffff',
        '--aura-color': themeDef.aura,
        animation: 'auraPulse 3.5s ease-in-out infinite',
      } as CSSProperties
    : undefined;

  const cardClass = themeDef
    ? 'rounded-3xl p-8 text-center'
    : profileUser.isPremium
      ? 'rounded-3xl p-8 text-center transition-all bg-slate-900/80 backdrop-blur-xl border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)] text-white'
      : 'rounded-3xl p-8 text-center transition-all bg-white border border-gray-100 shadow-sm text-gray-800';

  return (
    <div
      className={`min-h-screen pb-10 relative overflow-hidden ${themeDef
        ? 'theme-bg-anim'
        : profileUser.isPremium
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800'
          : 'bg-gray-50'}`}
      style={themeDef ? { backgroundImage: themeDef.bg } : undefined}
    >

      {/* ✨✨✨ AMBIANCE PLEIN ÉCRAN — derrière le contenu, jamais devant ✨✨✨ */}
      {themeDef && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">

          {/* 🌟 Orbes — grands halos doux qui traversent tout l'écran (tous les thèmes) */}
          <div className="theme-orb" style={{
            width: 440, height: 440, top: '5%', left: '2%', opacity: 0.45,
            background: `radial-gradient(circle, ${themeDef.particleColor}66 0%, transparent 70%)`,
            animation: 'orbA 26s ease-in-out infinite',
          }} />
          <div className="theme-orb" style={{
            width: 360, height: 360, top: '40%', left: '62%', opacity: 0.4,
            background: `radial-gradient(circle, ${themeDef.aura} 0%, transparent 70%)`,
            animation: 'orbB 34s ease-in-out infinite',
          }} />
          <div className="theme-orb" style={{
            width: 300, height: 300, top: '72%', left: '22%', opacity: 0.35,
            background: `radial-gradient(circle, ${themeDef.particleColor}44 0%, transparent 70%)`,
            animation: 'orbC 24s ease-in-out infinite',
          }} />

          {/* ✨ Particules — TOUT l'écran (retards négatifs : déjà remplies au chargement) */}
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={`p-${i}`} className="theme-particle"
              style={{
                top: `${(i * 43) % 100}%`,
                left: `${(i * 61 + 7) % 100}%`,
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
                background: themeDef.particleColor,
                animationDelay: `${(i * -1.35 % 7).toFixed(1)}s`,
                animationDuration: `${6 + (i % 5) * 2}s`,
              }} />
          ))}

          {/* 🌌 COSMOS — LÉGENDAIRE : nébuleuse + champ d'étoiles + étoiles filantes (WAOUH) */}
          {themeDef.key === 'THEME_COSMOS' && (
            <>
              {/* Nébuleuse supplémentaire */}
              <div className="theme-orb" style={{
                width: 520, height: 520, top: '15%', left: '55%', opacity: 0.5,
                background: 'radial-gradient(circle, #a78bfa55 0%, transparent 70%)',
                animation: 'orbB 40s ease-in-out infinite',
              }} />
              {/* 28 étoiles scintillantes réparties sur tout l'écran */}
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={`s-${i}`} className="theme-star"
                  style={{
                    top: `${(i * 37 + 11) % 100}%`,
                    left: `${(i * 53 + 3) % 100}%`,
                    width: i % 5 === 0 ? 4 : 2,
                    height: i % 5 === 0 ? 4 : 2,
                    background: '#ffffff',
                    boxShadow: '0 0 5px rgba(255,255,255,0.9)',
                    animationDelay: `${(i * 0.41) % 2.5}s`,
                    animationDuration: `${1.6 + (i % 3) * 0.9}s`,
                  }} />
              ))}
              {/* 2 étoiles filantes (trajectoires croisées) */}
              <div className="theme-shooting-star" style={{ top: 0, left: 0, animation: 'shootAcross 9s linear infinite' }} />
              <div className="theme-shooting-star" style={{ top: 0, left: 0, animation: 'shootAcrossB 14s linear 5s infinite' }} />
            </>
          )}
        </div>
      )}

      <header
        className={`relative z-10 border-b-2 ${themeDef ? 'border-white/10' : profileUser.isPremium ? 'border-white/10 bg-slate-900/50' : 'bg-white border-gray-100'}`}
        style={themeDef ? { background: 'rgba(0,0,0,0.4)' } : undefined}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/etudiant" className={`flex items-center gap-2 ${themeDef || profileUser.isPremium ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl">Profil Public</h1>
          </Link>
          <div className="flex items-center gap-2">
            {profileUser.isPremium && (
              <span className="bg-yellow-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">👑 {getPlanLabel(profileUser.premiumTier)}</span>
            )}
            {profileUser.passActive && (
              <span className="bg-gradient-to-r from-yellow-500 to-amber-400 text-[#1a1308] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">🪙 Pass Arène</span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto px-4 mt-6">
        <div className={cardClass} style={cardInline}>

          {/* Photo — CADRE 2.0 > Anneau d'Or > simple */}
          <div className="relative mx-auto mb-4">
            {profileUser.passActive || profileUser.activeFrameId ? (
              <GoldAvatar
                imageUrl={profileUser.imageUrl}
                initials={`${profileUser.prenom.charAt(0)}${profileUser.nom.charAt(0)}`}
                passActive={profileUser.passActive}
                frameKey={profileUser.activeFrameId}
                size={96}
              />
            ) : (
              <div className="relative w-24 h-24">
                {profileUser.isPremium && (
                  <div className="absolute inset-0 rounded-full bg-yellow-400 blur-md animate-pulse"></div>
                )}
                <div className="relative">
                  {profileUser.imageUrl ? (
                    <img src={profileUser.imageUrl} alt="Profile" className={`w-24 h-24 rounded-full mx-auto object-cover shadow-md ${profileUser.isPremium ? 'border-4 border-yellow-400' : 'border-4 border-emerald-500'}`} />
                  ) : (
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold mx-auto shadow-md text-4xl ${profileUser.isPremium ? 'bg-blue-500 text-white border-4 border-yellow-400' : 'bg-blue-500 text-white border-4 border-blue-200'}`}>
                      {profileUser.prenom.charAt(0)}{profileUser.nom.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-extrabold">
            {profileUser.pseudo || `${profileUser.prenom} ${profileUser.nom}`}
          </h2>

          {titleDef && (
            <span className={`inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-extrabold ${RARITY_STYLES[titleDef.rarity].cls}`}>
              {titleDef.icon} {titleDef.name}
            </span>
          )}

          <div className="flex justify-center gap-2 mt-4">
            <span {...badgeProps('bg-blue-500/20 text-blue-300', 'bg-blue-50 text-blue-600')}>{getNiveauLabel(profileUser.anneeEtude)}</span>
            <span {...badgeProps('bg-emerald-500/20 text-emerald-300', 'bg-emerald-50 text-emerald-600')}>⭐ {profileUser.xp} XP</span>
            <span {...badgeProps('bg-orange-500/20 text-orange-300', 'bg-orange-50 text-orange-600')}>🔥 {profileUser.streak} Jours</span>
          </div>

          <div className={`mt-6 p-4 rounded-2xl ${themeDef || profileUser.isPremium ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50" style={themeDef ? undefined : (profileUser.isPremium ? undefined : { color: '#9ca3af' })}>Grade Actuel</p>
            <p className={`text-xl mt-1 ${themeDef ? 'font-extrabold' : profileUser.isPremium
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 animate-pulse font-extrabold'
              : 'font-extrabold text-gray-800'}`}
              style={themeDef ? { color: themeDef.accent } : undefined}>
              {grade}
            </p>
          </div>

          <div className={`mt-8 text-left border-t pt-6 ${themeDef || profileUser.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">⚔️ Duels Arena</h3>
            <div className="flex justify-center flex-wrap gap-2 mb-4">
              <span {...badgeProps('bg-emerald-500/20 text-emerald-300', 'bg-emerald-50 text-emerald-600')}>🏆 {profileUser.duelsWon} Victoires</span>
              <span {...badgeProps('bg-red-500/20 text-red-300', 'bg-red-50 text-red-600')}>❌ {profileUser.duelsLost} Défaites</span>
              <span {...badgeProps('bg-purple-500/20 text-purple-300', 'bg-purple-50 text-purple-600')}>{duelGrade.icon} {duelGrade.name}</span>
            </div>
            <ChallengeDuelButton
              targetId={profileUser.id}
              targetName={profileUser.pseudo || `${profileUser.prenom} ${profileUser.nom}`}
              sameLevel={user.anneeEtude === profileUser.anneeEtude}
              myTier={user.premiumTier ?? null}
              targetPremium={profileUser.isPremium}
            />
          </div>

          <div className={`mt-8 text-left border-t pt-6 ${themeDef || profileUser.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">Trophées de {profileUser.prenom} 🏆</h3>
            {profileUser.badges.length === 0 ? (
              <p className={`text-sm text-center py-4 rounded-2xl ${themeDef || profileUser.isPremium ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-400'}`}>Aucun badge débloqué pour le moment.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {profileUser.badges.map((ub) => (
                  <div key={ub.badgeId}
                    className={`flex flex-col items-center justify-center w-24 p-3 rounded-2xl ${themeDef ? '' : profileUser.isPremium ? 'bg-yellow-500/10 border-2 border-yellow-400/30' : 'bg-yellow-50 border-2 border-yellow-100'}`}
                    style={themeDef ? { background: themeDef.badgeBg, border: `2px solid ${themeDef.borderColor}` } : undefined}>
                    <span className="text-4xl mb-1">{ub.badge.icon}</span>
                    <span className={`text-xs font-bold text-center ${themeDef || profileUser.isPremium ? 'text-yellow-200' : 'text-yellow-800'}`}>{ub.badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}