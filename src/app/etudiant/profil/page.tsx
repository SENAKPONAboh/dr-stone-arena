import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Link from 'next/link';
import UpdateProfileForm from '@/components/dashboard/UpdateProfileForm';
import ChangePasswordForm from '@/components/dashboard/ChangePasswordForm';
import { getNiveauLabel } from '@/lib/niveau';
import { getPlanLabel } from '@/lib/premium';
import { getDuelGrade } from '@/lib/duel';
import prisma from '@/lib/prisma';
import { getXpGrade } from '@/lib/grades';
import { getSeasonSummary } from '@/lib/seasons';
import GradeBadge from '@/components/ui/GradeBadge';
import SeasonPalmares from '@/components/ui/SeasonPalmares';
import type { CSSProperties } from 'react';
import { getTitleDef, getThemeDef } from '@/lib/personnalisation-data';
import GoldAvatar from '@/components/ui/GoldAvatar';
import TitleBadge from '@/components/ui/TitleBadge';
import ThemeBackdrop from '@/components/ui/ThemeBackdrop';

export default async function ProfilPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  // Objets de la boutique équipés (cadre, titre, thème) : visibles aussi sur MON profil
  const equipped = await prisma.user.findUnique({
    where: { id: user.id },
    select: { activeTitleId: true, activeFrameId: true, activeThemeId: true, passActive: true },
  });
  const titleDef = getTitleDef(equipped?.activeTitleId);
  const themeDef = getThemeDef(equipped?.activeThemeId);
  const cardInline: CSSProperties | undefined = themeDef
    ? ({ background: themeDef.cardBg, border: `2px solid ${themeDef.borderColor}`, color: '#ffffff', '--aura-color': themeDef.aura, animation: 'auraPulse 3.5s ease-in-out infinite' } as CSSProperties)
    : undefined;

  // Grade de la saison + palmarès des saisons passées
  const xpGrade = getXpGrade(user.xp).current;
  const seasons = await getSeasonSummary(user.id);

  const { current: duelGrade, next: nextDuelGrade } = getDuelGrade(user.duelsWon);
  const duelProgress = nextDuelGrade
    ? Math.min(100, Math.round(((user.duelsWon - duelGrade.minWins) / (nextDuelGrade.minWins - duelGrade.minWins)) * 100))
    : 100;

  // Styles conditionnels selon l'abonnement
  const cardStyle = user.isPremium
    ? "bg-slab border-2 border-gold/50 text-ink"
    : "bg-slab border border-line text-ink";

  const gradeStyle = user.isPremium
    ? "font-display font-extrabold text-gold"
    : "font-display font-extrabold text-ink";

  const badgeBoxStyle = user.isPremium
    ? "bg-gold/10 border-2 border-gold/30 rounded-2xl"
    : "bg-slab-2 border-2 border-line rounded-2xl";

  return (
    // 🖥️📱 PLEIN ÉCRAN : recouvre la coquille classique — la flèche retour sert de sortie
    <div
      className={`fixed inset-0 z-[80] overflow-y-auto overscroll-contain pb-10 font-body text-ink ${themeDef ? 'theme-bg-anim' : 'bg-stone'}`}
      style={themeDef ? { backgroundImage: themeDef.bg } : undefined}
    >
      {themeDef && <ThemeBackdrop themeKey={themeDef.key} />}

      <header className={`relative z-10 border-b ${themeDef ? 'border-white/10' : 'border-line bg-stone'}`} style={themeDef ? { background: 'rgba(0,0,0,0.4)' } : undefined}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/etudiant" className={`flex items-center gap-2 text-mute hover:text-ink`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <h1 className="font-extrabold text-xl">Mon Profil</h1>
          </a>
          {user.isPremium && (
            <span className="bg-gold text-stone text-xs font-display font-bold px-3 py-1 rounded-full uppercase tracking-wider">👑 {getPlanLabel(user.premiumTier)}</span>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto px-4 mt-6">
        <div className={`rounded-3xl p-8 text-center transition-all ${themeDef ? '' : cardStyle}`} style={cardInline}>

          {/* Photo de profil : cadre équipé > Anneau d'Or (Pass) > simple */}
          {equipped?.passActive || equipped?.activeFrameId ? (
            <div className="relative mx-auto mb-4 flex justify-center">
              <GoldAvatar imageUrl={user.imageUrl} initials={`${user.prenom.charAt(0)}${user.nom.charAt(0)}`} passActive={!!equipped?.passActive} frameKey={equipped?.activeFrameId} size={96} />
            </div>
          ) : (
            <>
          <div className="relative mx-auto mb-4 w-24 h-24">
            {user.isPremium && (
              <div className="absolute inset-0 rounded-full bg-yellow-400 blur-md animate-pulse"></div>
            )}
            <div className="relative">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className={`w-24 h-24 rounded-full mx-auto object-cover shadow-md ${user.isPremium ? 'border-4 border-yellow-400' : 'border-4 border-emerald-500'}`} />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold mx-auto shadow-md text-4xl ${user.isPremium ? 'bg-blue-500 text-white border-4 border-yellow-400' : 'bg-blue-500 text-white border-4 border-blue-200'}`}>
                  {user.prenom.charAt(0)}{user.nom.charAt(0)}
                </div>
              )}
            </div>
          </div>

            </>
          )}

          <h2 className="text-2xl font-extrabold">
            {user.pseudo || `${user.prenom} ${user.nom}`}
          </h2>
          {titleDef && <div className="mt-2"><TitleBadge title={titleDef} /></div>}
          <p className={user.isPremium ? "text-white/60" : "text-gray-500"}>{user.email}</p>
          {user.pays && (
            <p className={`text-sm mt-1 ${user.isPremium ? 'text-white/50' : 'text-gray-400'}`}>
              🌍 {user.pays}{user.universite ? ` · 🏫 ${user.universite}` : ''}
            </p>
          )}

          {/* Badges rapides */}
          <div className="flex justify-center gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>{getNiveauLabel(user.anneeEtude)}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>⭐ {user.xp} XP</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-600'}`}>🔥 {user.streak} Jours</span>
          </div>

          {/* Grade avec animation Premium */}
          <div className={`mt-6 p-4 rounded-2xl ${user.isPremium ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider ${user.isPremium ? 'text-white/50' : 'text-gray-400'}`}>Grade Actuel</p>
            <div className="mt-2 flex justify-center"><GradeBadge grade={xpGrade} size="lg" /></div>
            <Link href="/etudiant/grades" className={`mt-2 inline-block text-xs font-bold ${user.isPremium ? 'text-yellow-300 hover:text-yellow-200' : 'text-blue-600 hover:underline'}`}>
              🏅 Voir tous les grades →
            </Link>
          </div>

          <div className="mt-4"><SeasonPalmares summary={seasons} own /></div>

          {/* Formulaire de modification */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">Modifier mes informations</h3>
            <UpdateProfileForm currentPseudo={user.pseudo} currentImageUrl={user.imageUrl} isPremium={user.isPremium} currentAnneeEtude={user.anneeEtude} />
          </div>

          {/* Accès rapides */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/etudiant/stats" className={`py-3 font-bold rounded-2xl text-center text-sm transition-all ${user.isPremium ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              📊 Mes statistiques
            </Link>
            <Link href="/etudiant/history" className={`py-3 font-bold rounded-2xl text-center text-sm transition-all ${user.isPremium ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
              📚 Mon historique
            </Link>
          </div>

          {/* Changement de mot de passe */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">🔒 Sécurité (Changer de mot de passe)</h3>
            <ChangePasswordForm />
          </div>

          {/* Statistiques de Duel */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">⚔️ Duels Arena</h3>
            <div className="flex justify-center flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>🏆 {user.duelsWon} Victoires</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'}`}>❌ {user.duelsLost} Défaites</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.isPremium ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>🏟️ {user.pointsArena} pts</span>
            </div>
            <p className={`text-sm font-bold mb-2 ${user.isPremium ? 'text-white' : 'text-gray-800'}`}>{duelGrade.icon} Grade : {duelGrade.name}</p>
            {nextDuelGrade ? (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-red-400 to-orange-500 transition-all" style={{ width: `${duelProgress}%` }}></div>
                </div>
                <p className="text-xs text-gray-400">{user.duelsWon}/{nextDuelGrade.minWins} victoires → {nextDuelGrade.icon} {nextDuelGrade.name}</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">👑 Grade maximum atteint — Légende Arena !</p>
            )}
          </div>

          {/* Affichage des Badges */}
          <div className={`mt-8 text-left border-t pt-6 ${user.isPremium ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className="font-bold mb-4">Mes Trophées 🏆</h3>
            {user.badges.length === 0 ? (
              <p className={`text-sm text-center py-4 rounded-2xl ${user.isPremium ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-400'}`}>Aucun badge débloqué pour le moment. Continue tes défis !</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {user.badges.map((ub) => (
                  <div key={ub.badgeId} className={`flex flex-col items-center justify-center w-24 p-3 ${badgeBoxStyle}`}>
                    <span className="text-4xl mb-1">{ub.badge.icon}</span>
                    <span className={`text-xs font-bold text-center ${user.isPremium ? 'text-yellow-200' : 'text-yellow-800'}`}>{ub.badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <LogoutButton />
        </div>
      </main>
    </div>
  );
}