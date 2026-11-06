'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Logo from '@/components/ui/Logo';
import BackgroundCells from '@/components/ui/BackgroundCells';
import GradeEmblem from '@/components/ui/GradeEmblem';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import { XP_GRADES } from '@/lib/grades';
import { WHATSAPP_COMMUNITY_URL } from '@/lib/community';
import PushNotificationManager, { type PushStatus } from '@/components/dashboard/PushNotificationManager';
import WhatsappVerifyCard from '@/components/dashboard/WhatsappVerifyCard';

type Slide = {
  icon: string;
  title: string;
  kicker: string;           // petit titre au-dessus
  paragraphs: string[];
  points?: string[];        // puces courtes
  highlight?: string;       // phrase mise en avant
  from: string;             // couleur d'accent (dégradé du halo)
  to: string;
  extra?: 'grades' | 'theme' | 'profile' | 'whatsapp' | 'notifs' | 'verify';
};

// Accueil COURT (6 nov. 2026) : 8 écrans au lieu de 18 — 42 % des inscrits abandonnaient pendant les 12 écrans
// d'explications. Le reste (duels, tournoi, Élite, Premium, badges…) se découvre dans l'application.
// Les 3 étapes obligatoires (communauté WhatsApp, notifications, numéro) sont inchangées.
const SLIDES: Slide[] = [
  {
    icon: '🩺', kicker: 'Bienvenue', title: 'Dr. Stone Arena',
    paragraphs: [
      "Chaque jour, 10 cas cliniques t'attendent, choisis pour ton niveau. Tu réponds (A, B, C ou D), tu vois aussitôt la correction expliquée, et chaque bonne réponse te rapporte de l'XP.",
    ],
    points: ['🎯 10 cas par jour', '💡 Correction expliquée', '⭐ XP et grades'],
    highlight: "Tu ne récites pas un cours : tu raisonnes comme un médecin.",
    from: '#2fd28a', to: '#5cc8ff',
  },
  {
    icon: '🔥', kicker: 'Régularité', title: 'La Flamme et les vies',
    paragraphs: [
      "La Flamme compte tes jours de jeu d'affilée : ne la laisse pas s'éteindre. Une mauvaise réponse te fait perdre une vie, et tes vies reviennent avec le temps.",
    ],
    points: ['🔥 Joue chaque jour', '❤️ 10 vies maximum', '🎁 Coffre tous les 7 jours'],
    from: '#ff8a3d', to: '#ff5470',
  },
  {
    icon: '🎁', kicker: 'Cadeau de bienvenue', title: '7 jours de Découverte',
    paragraphs: [
      "Pendant tes 7 premiers jours, tout ce qui est Premium est ouvert gratuitement : tes vies reviennent toutes les 2 heures et tu peux jouer jusqu'à 7 duels par jour.",
      "Un bandeau sur l'accueil te montre combien de jours il te reste. (L'Espace Élite reste à part : il dépend du Pass Élite.)",
    ],
    points: ['❤️ 1 vie toutes les 2 h', '⚔️ 7 duels par jour', '⏳ 7 jours offerts'],
    highlight: "Profite de ces 7 jours pour tout essayer !",
    from: '#5cc8ff', to: '#2fd28a',
  },
  {
    icon: '😎', kicker: 'Ton identité', title: 'Choisis ton pseudo et ta photo',
    paragraphs: [
      "Ton pseudo et ta photo s'affichent partout : dans le classement, le Top 3 de l'accueil, les duels et ton profil public.",
      "Un pseudo qui claque et une vraie photo, c'est ce qui te fait reconnaître dans l'Arène : tes adversaires sauront qui les a battus ! Tu peux les changer quand tu veux dans ton Profil.",
    ],
    points: ['🏆 Visible au classement', '⚔️ Visible en duel', '✏️ Modifiable à tout moment'],
    highlight: "Fais-toi un nom dans l'Arène.",
    from: '#a855f7', to: '#5cc8ff', extra: 'profile',
  },
  {
    icon: '💬', kicker: 'Étape obligatoire', title: 'Rejoins la communauté WhatsApp',
    paragraphs: [
      "Toutes les annonces de l'Arena passent par la communauté WhatsApp : nouveaux cas, tournois, Rush, résultats, Prime Arena, aide en cas de problème.",
      "Touche le bouton vert, rejoins la communauté, puis reviens ici pour continuer.",
    ],
    from: '#25d366', to: '#2fd28a', extra: 'whatsapp',
  },
  {
    icon: '🔔', kicker: 'Étape obligatoire', title: 'Active tes notifications',
    paragraphs: [
      "Sans notifications, tu rates les défis de duel, la fin de ta Découverte, la validation de ton Premium ou de ton Pass et les annonces importantes.",
    ],
    from: '#5cc8ff', to: '#2fd28a', extra: 'notifs',
  },
  {
    icon: '✅', kicker: 'Étape obligatoire', title: 'Vérifie ton numéro WhatsApp',
    paragraphs: [
      "10 secondes : 1) touche le bouton vert, 2) WhatsApp s'ouvre avec ton code déjà écrit, 3) appuie sur Envoyer, puis reviens ici.",
      "Tu reçois aussitôt « Numéro vérifié » sur WhatsApp et tu peux continuer. Un seul compte par numéro : c'est ce qui protège l'Arena des faux comptes.",
    ],
    from: '#25d366', to: '#5cc8ff', extra: 'verify',
  },
  {
    icon: '🚀', kicker: "C'est parti", title: "Entre dans l'Arena",
    paragraphs: [
      "Ta première garde de 10 cas t'attend. Duels, classements, tournoi du mois, Espace Élite : tu les découvriras au fur et à mesure dans l'application.",
    ],
    highlight: "Deviens meilleur qu'hier. Bienvenue dans Dr. Stone Arena.",
    from: '#2fd28a', to: '#5cc8ff',
  },
];

export default function OnboardingCarousel({ prenom }: { prenom: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [finishing, setFinishing] = useState(false);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  // ===== Étapes obligatoires : communauté WhatsApp + notifications =====
  const [waOpened, setWaOpened] = useState(false);   // a touché « Rejoindre »
  const [waJoined, setWaJoined] = useState(false);   // a confirmé « J'ai rejoint »
  const [pushStatus, setPushStatus] = useState<PushStatus>('loading');
  const [pushTries, setPushTries] = useState(0);     // vérifications ratées (permission bloquée, iPhone…)
  const pushImpossible = pushStatus === 'unsupported' || pushStatus === 'no-key';
  const pushDone = pushStatus === 'on' || pushImpossible || pushTries >= 2;
  const onPushStatus = useCallback((s: PushStatus) => setPushStatus(s), []);
  // Vérification du numéro : faite (ou non branchée) → on avance. Secours : « Plus tard » après 2 minutes sur l'étape
  // (problème de réseau, pas WhatsApp sur ce téléphone…) — la carte reste ensuite sur l'accueil.
  const [verifyDone, setVerifyDone] = useState(false);
  const [verifySkippable, setVerifySkippable] = useState(false);
  const onVerifyDone = useCallback(() => setVerifyDone(true), []);
  useEffect(() => {
    if (SLIDES[index].extra !== 'verify' || verifySkippable) return;
    const t = setTimeout(() => setVerifySkippable(true), 120_000);
    return () => clearTimeout(t);
  }, [index, verifySkippable]);
  const slideOk = (s: Slide) => s.extra === 'whatsapp' ? waJoined : s.extra === 'notifs' ? pushDone : s.extra === 'verify' ? (verifyDone || verifySkippable) : true;
  // On ne peut pas dépasser la première étape obligatoire non faite (boutons, swipe, flèches, barre).
  const firstBlocked = SLIDES.findIndex(s => !slideOk(s));
  const blocked = !slideOk(slide);

  const go = useCallback((to: number) => {
    setIndex(i => {
      let next = Math.max(0, Math.min(SLIDES.length - 1, to));
      if (firstBlocked !== -1 && next > firstBlocked) next = Math.max(i, firstBlocked);
      setDir(next >= i ? 1 : -1);
      return next;
    });
  }, [firstBlocked]);

  // Flèches du clavier (PC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go]);

  const finish = async (dest: string = '/etudiant') => {
    setFinishing(true);
    if (!reduce) confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, colors: ['#2fd28a', '#5cc8ff', '#f2c14e', '#ffffff'] });
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      window.location.href = dest;
    } catch (e) {
      setFinishing(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-stone p-4 font-body text-ink">
      <BackgroundCells />
      <div className="absolute right-4 top-4 z-10"><ThemeSwitch /></div>

      <div className="relative z-10 w-full max-w-lg">

        {/* Logo + barre de progression */}
        <div className="mb-5 flex flex-col items-center gap-3">
          <Logo size={48} />
          <div className="flex w-full max-w-xs gap-1">
            {SLIDES.map((s, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Étape ${i + 1}`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full transition-all duration-500"
                  style={{ width: i <= index ? '100%' : '0%', background: `linear-gradient(90deg, ${SLIDES[index].from}, ${SLIDES[index].to})` }} />
              </button>
            ))}
          </div>
        </div>

        {/* Carte (glissable au doigt) */}
        <div className="overflow-hidden rounded-3xl border border-line bg-slab shadow-2xl">
          <div>
            <motion.div
              key={index}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70) go(index + 1);
                else if (info.offset.x > 70) go(index - 1);
              }}
              className="min-h-[430px] p-7"
            >
              {/* Illustration : halo coloré + icône animée */}
              <div className="relative mb-5 flex justify-center">
                <span className="absolute h-28 w-28 rounded-full blur-2xl" style={{ background: `linear-gradient(135deg, ${slide.from}, ${slide.to})`, opacity: 0.55, animation: reduce ? undefined : 'logo-pulse 3s ease-in-out infinite' }} />
                <motion.span
                  initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-line text-5xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${slide.from}33, ${slide.to}22)` }}
                >
                  <span style={{ animation: reduce ? undefined : 'node-breathe 2.6s ease-in-out infinite' }}>{slide.icon}</span>
                </motion.span>
              </div>

              <p className="mb-1 text-center font-display text-[11px] font-extrabold uppercase tracking-[0.25em]" style={{ color: slide.from }}>{slide.kicker}</p>
              <h2 className="mb-4 text-center font-display text-2xl font-black leading-tight">{slide.title}</h2>

              <div className="space-y-3 text-[15px] leading-relaxed text-ink/85">
                {slide.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>

              {/* Illustration des 8 grades */}
              {slide.extra === 'grades' && (
                <div className="mt-4 grid grid-cols-8 items-end gap-1">
                  {XP_GRADES.map(g => (
                    <div key={g.key} className="flex justify-center"><GradeEmblem grade={g} size={34} /></div>
                  ))}
                </div>
              )}
              {slide.extra === 'whatsapp' && (
                <div className="mt-5 space-y-3">
                  <a href={WHATSAPP_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" onClick={() => setWaOpened(true)}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25d366] font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#128c4a] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#128c4a]">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2Z" /></svg>
                    Rejoindre la communauté
                  </a>
                  <button type="button" onClick={() => { setWaJoined(true); setDir(1); setIndex(i => i + 1); }} disabled={!waOpened}
                    className="h-11 w-full rounded-2xl border-2 border-mala/50 bg-mala/10 font-display text-xs font-extrabold uppercase tracking-wide text-mala transition-opacity disabled:opacity-35">
                    {waJoined ? '✓ Communauté rejointe' : "J'ai rejoint, continuer"}
                  </button>
                  {!waOpened && <p className="text-center text-[11px] text-mute">Touche d&apos;abord le bouton vert pour ouvrir WhatsApp.</p>}
                </div>
              )}
              {slide.extra === 'notifs' && (
                <div className="mt-5 space-y-3 rounded-2xl border border-line bg-slab-2 p-4">
                  {/* key : « vérifier à nouveau » recrée le gestionnaire, qui relit l'autorisation du téléphone */}
                  <PushNotificationManager key={pushTries} onStatus={onPushStatus} />
                  {!pushDone && (pushStatus === 'denied' || pushStatus === 'ios-install') && (
                    <button type="button" onClick={() => setPushTries(t => t + 1)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-xs font-bold text-mute">
                      J&apos;ai suivi les instructions, vérifier à nouveau
                    </button>
                  )}
                  {pushStatus === 'on' && <p className="text-center text-xs font-bold text-mala">Parfait, tu ne rateras rien !</p>}
                  {pushStatus !== 'on' && pushDone && (
                    <p className="text-center text-[11px] text-mute">Tu pourras les activer plus tard depuis la cloche.</p>
                  )}
                </div>
              )}
              {slide.extra === 'verify' && (
                <div className="mt-5 rounded-2xl border border-[#25d366]/40 bg-slab-2 p-4">
                  <WhatsappVerifyCard inline onDone={onVerifyDone} />
                  {!verifyDone && verifySkippable && (
                    <p className="mt-3 text-center text-[11px] text-mute">Un souci ? Tu peux continuer : la vérification restera proposée sur ton accueil.</p>
                  )}
                </div>
              )}
              {slide.extra === 'profile' && (
                <p className="mt-4 text-center text-xs text-mute">
                  À la fin de cette présentation, un bouton t&apos;emmène directement à ton profil.
                </p>
              )}
              {isLast && (
                <button type="button" onClick={() => finish('/etudiant/profil')} disabled={finishing}
                  className="mt-4 w-full rounded-2xl border-2 border-sky/40 bg-sky/10 py-3 font-display text-xs font-extrabold uppercase tracking-wide text-sky disabled:opacity-60">
                  😎 Choisir mon pseudo et ma photo
                </button>
              )}
              {slide.extra === 'theme' && (
                <div className="mt-4"><ThemeSwitch variant="full" /></div>
              )}

              {slide.points && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {slide.points.map(p => (
                    <span key={p} className="rounded-full border border-line bg-slab-2 px-3 py-1.5 text-xs font-bold text-ink">{p}</span>
                  ))}
                </div>
              )}

              {slide.highlight && (
                <p className="mt-4 rounded-2xl border p-3.5 text-center text-sm font-bold leading-snug"
                  style={{ borderColor: `${slide.from}66`, background: `linear-gradient(135deg, ${slide.from}1f, ${slide.to}14)` }}>
                  {slide.highlight}
                </p>
              )}

              {isLast && <p className="mt-4 text-center text-sm text-mute">Prêt à commencer, {prenom} ?</p>}
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 border-t border-line p-4">
            <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Précédent"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-slab-2 text-lg font-bold text-ink transition-opacity disabled:opacity-30">
              ←
            </button>
            {isLast ? (
              <button onClick={() => finish()} disabled={finishing}
                className="h-12 flex-1 rounded-2xl bg-mala font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f] disabled:opacity-60">
                {finishing ? '…' : '🚀 Commencer'}
              </button>
            ) : (
              <button onClick={() => go(index + 1)} disabled={blocked}
                className="h-12 flex-1 rounded-2xl bg-mala font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f] disabled:opacity-40 disabled:shadow-none">
                {blocked ? (slide.extra === 'whatsapp' ? 'Rejoins la communauté' : slide.extra === 'verify' ? 'Vérifie ton numéro' : 'Active les notifications') : 'Suivant →'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-mute">Étape {index + 1} / {SLIDES.length} · glisse du doigt ou utilise les flèches</p>
      </div>
    </div>
  );
}
