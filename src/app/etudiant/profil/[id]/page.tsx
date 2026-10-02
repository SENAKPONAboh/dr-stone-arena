import Coin from '@/components/ui/Coin';
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
import { getTitleDef, getThemeDef } from '@/lib/personnalisation-data';
import TitleBadge from '@/components/ui/TitleBadge';
import GradeBadge from '@/components/ui/GradeBadge';
import SeasonPalmares from '@/components/ui/SeasonPalmares';
import { getXpGrade } from '@/lib/grades';
import { getSeasonSummary } from '@/lib/seasons';
import ThemeBackdrop from '@/components/ui/ThemeBackdrop';

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

  const xpGrade = getXpGrade(profileUser.xp).current;
  const seasons = await getSeasonSummary(profileUser.id);

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
      ? 'rounded-3xl p-8 text-center transition-all bg-slab border-2 border-gold/50 text-ink'
      : 'rounded-3xl p-8 text-center transition-all bg-slab border border-line text-ink';

  return (
    // 🖥️📱 COUCHE PLEIN ÉCRAN : recouvre totalement la coquille de l'app
    // (barre du bas incluse) — le profil a sa propre flèche retour.
    // Défilement interne + overscroll-contain : expérience mobile propre.
    <div
      className={`fixed inset-0 z-[80] overflow-y-auto overscroll-contain pb-10 ${themeDef
        ? 'theme-bg-anim'
        : 'bg-stone'}`}
      style={themeDef ? { backgroundImage: themeDef.bg } : undefined}
    >

      {/* ✨ AMBIANCE PLEIN ÉCRAN — effet signature du thème équipé */}
      {themeDef && <ThemeBackdrop themeKey={themeDef.key} />}

      <header
        className={`relative z-10 border-b ${themeDef ? 'border-white/10' : 'border-line bg-stone'}`}
        style={themeDef ? { background: 'rgba(0,0,0,0.4)' } : undefined}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/etudiant" className={`flex items-center gap-2 ${themeDef ? 'text-white/80 hover:text-white' : 'text-mute hover:text-ink'}`}>
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
              <span className="bg-gradient-to-r from-yellow-500 to-amber-400 text-[#1a1308] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider"><Coin /> Pass Arène</span>
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
            <div className="mt-2"><TitleBadge title={titleDef} /></div>
          )}

          <div className="flex justify-center gap-2 mt-4">
            <span {...badgeProps('bg-blue-500/20 text-blue-300', 'bg-blue-50 text-blue-600')}>{getNiveauLabel(profileUser.anneeEtude)}</span>
            <span {...badgeProps('bg-emerald-500/20 text-emerald-300', 'bg-emerald-50 text-emerald-600')}>⭐ {profileUser.xp} XP</span>
            <span {...badgeProps('bg-orange-500/20 text-orange-300', 'bg-orange-50 text-orange-600')}>🔥 {profileUser.streak} Jours</span>
          </div>

          <div className={`mt-6 p-4 rounded-2xl ${themeDef ? 'bg-white/5' : 'bg-slab-2'}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50" style={themeDef ? undefined : (profileUser.isPremium ? undefined : { color: '#9ca3af' })}>Grade Actuel</p>
            <div className="mt-2 flex justify-center"><GradeBadge grade={xpGrade} size="lg" /></div>
          </div>

          <div className="mt-4"><SeasonPalmares summary={seasons} /></div>

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