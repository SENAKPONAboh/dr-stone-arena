'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Logo from '@/components/ui/Logo';
import BackgroundCells from '@/components/ui/BackgroundCells';
import GradeEmblem from '@/components/ui/GradeEmblem';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import { XP_GRADES } from '@/lib/grades';

type Slide = {
  icon: string;
  title: string;
  kicker: string;           // petit titre au-dessus
  paragraphs: string[];
  points?: string[];        // puces courtes
  highlight?: string;       // phrase mise en avant
  from: string;             // couleur d'accent (dégradé du halo)
  to: string;
  extra?: 'grades' | 'theme';
};

// Contenu à jour : garde de 10 cas, saisons mensuelles, 8 grades, Espace Élite / Pass Élite, Premium, thèmes, installation.
const SLIDES: Slide[] = [
  {
    icon: '🩺', kicker: 'Bienvenue', title: 'Dr. Stone Arena',
    paragraphs: [
      "Révise la médecine comme un jeu. Tu résous des cas cliniques sous forme de QCM (A, B, C, D) adaptés à ton niveau, tu gagnes de l'expérience et tu montes dans l'Arène.",
    ],
    highlight: "Tu ne récites pas un cours : tu raisonnes comme un médecin.",
    from: '#2fd28a', to: '#5cc8ff',
  },
  {
    icon: '🎯', kicker: 'Chaque jour', title: 'Ta garde de 10 cas',
    paragraphs: [
      "Chaque jour, 10 nouveaux cas t'attendent, choisis pour ton niveau (de la 1ère année à Médecin). Tu avances sur un parcours, chronomètre en main.",
      "Après chaque réponse, tu vois tout de suite la correction et l'explication du raisonnement.",
    ],
    points: ['⏱️ Un chrono par cas', '💡 Correction expliquée', '🔒 Reste sur la page pendant un cas'],
    highlight: "Comprendre pourquoi vaut mieux que deviner.",
    from: '#5cc8ff', to: '#2fd28a',
  },
  {
    icon: '⭐', kicker: 'Progression', title: 'XP, grades et saisons',
    paragraphs: [
      "Chaque bonne réponse rapporte de l'XP (bonus de rapidité, bonus de série). Ton grade dépend de tes XP du mois, de Novice de l'Arène jusqu'à Légende Immortelle.",
      "Chaque mois est une saison : les XP repartent à zéro pour que tout le monde puisse rattraper les autres. Ton grade final est gardé dans ton profil, avec le nombre de fois où tu l'as atteint.",
    ],
    highlight: "Un joueur régulier et sérieux peut atteindre le sommet en un seul mois.",
    from: '#f472b6', to: '#a5f3fc', extra: 'grades',
  },
  {
    icon: '🔥', kicker: 'Régularité', title: 'La Flamme et les vies',
    paragraphs: [
      "La Flamme compte tes jours consécutifs de jeu : ne la laisse pas s'éteindre. À chaque série de 7 jours, un coffre t'attend.",
      "Tu as jusqu'à 10 vies. Une mauvaise réponse en fait perdre une, puis elles se régénèrent avec le temps (plus vite avec Premium).",
    ],
    points: ['🔥 1 jour de plus = Flamme plus forte', '❤️ 10 vies maximum', '🎁 Coffre tous les 7 jours'],
    from: '#ff8a3d', to: '#ff5470',
  },
  {
    icon: '⚔️', kicker: 'Face à face', title: 'Les duels',
    paragraphs: [
      "Défie un joueur de ton niveau sur 5 cas identiques. Le meilleur résultat gagne des Points Arena et fait grimper ton grade de duel.",
      "Les duels sont réservés aux membres Premium. Perdre un duel ne te fait jamais perdre de vie.",
    ],
    from: '#ff5470', to: '#ff8a3d',
  },
  {
    icon: '🏆', kicker: 'Reconnaissance', title: 'Classements et profil',
    paragraphs: [
      "Compare-toi au classement du mois : global, par niveau ou par pays. Ton profil public montre ton grade, ton palmarès de saisons (« Légende Immortelle ×2 »), tes badges et tes objets équipés.",
      "À la fin de chaque mois, les meilleurs du classement peuvent être sélectionnés pour une compétition spéciale.",
    ],
    highlight: "Chaque nouveau mois, tout le monde repart sur la même ligne de départ.",
    from: '#f2c14e', to: '#ff8a3d',
  },
  {
    icon: '🎖️', kicker: 'Récompenses', title: 'Badges et coffres',
    paragraphs: [
      "Les badges se gagnent par tes actions : régularité, performances, duels, défis. Ils ne s'achètent pas.",
      "Les coffres sont des récompenses surprise, débloquées par ta Flamme.",
    ],
    from: '#a855f7', to: '#f0abfc',
  },
  {
    icon: '🛡️', kicker: 'Espace Élite', title: 'Le Pass Élite',
    paragraphs: [
      "Le Pass Élite (2 000 FCFA par mois) te donne accès à l'Espace Élite : 10 cas Élite par jour, le Rush du week-end, la boutique, la personnalisation (cadres animés, thèmes, titres) et le classement Élite.",
      "Tes réussites te rapportent des points de mérite. La Prime Arena est une bourse de mérite qui récompense ta performance : elle n'est pas garantie.",
    ],
    highlight: "Tu paies un accès, pas une mise. C'est ton travail qui compte.",
    from: '#f2c14e', to: '#fde68a',
  },
  {
    icon: '💎', kicker: 'Confort', title: 'Premium',
    paragraphs: [
      "Premium (3 niveaux) te donne des vies qui reviennent plus vite et l'accès aux duels, avec un badge doré sur ton profil.",
    ],
    highlight: "Premium n'apporte aucun avantage injuste : pas de réponses, pas de questions simplifiées, pas d'XP en plus.",
    from: '#5cc8ff', to: '#a5f3fc',
  },
  {
    icon: '🎨', kicker: 'À ta façon', title: 'Ton application',
    paragraphs: [
      "Choisis ton thème, sombre ou clair, dans Profil → Apparence (ou avec le bouton soleil/lune).",
      "Installe l'application sur ton téléphone : sur Android, touche « Installer l'application » ; sur iPhone, Partager puis « Sur l'écran d'accueil ». Active aussi les notifications avec la cloche pour ne pas rater un duel.",
    ],
    from: '#2fd28a', to: '#f2c14e', extra: 'theme',
  },
  {
    icon: '🚀', kicker: "C'est parti", title: "Entre dans l'Arena",
    paragraphs: [
      "Analyse les cas. Apprends de tes erreurs. Reviens chaque jour.",
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

  const go = useCallback((to: number) => {
    setIndex(i => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, to));
      setDir(next >= i ? 1 : -1);
      return next;
    });
  }, []);

  // Flèches du clavier (PC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go]);

  const finish = async () => {
    setFinishing(true);
    if (!reduce) confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, colors: ['#2fd28a', '#5cc8ff', '#f2c14e', '#ffffff'] });
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      window.location.href = '/etudiant';
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
              <button onClick={finish} disabled={finishing}
                className="h-12 flex-1 rounded-2xl bg-mala font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f] disabled:opacity-60">
                {finishing ? '…' : '🚀 Commencer'}
              </button>
            ) : (
              <button onClick={() => go(index + 1)}
                className="h-12 flex-1 rounded-2xl bg-mala font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
                Suivant →
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-mute">Étape {index + 1} / {SLIDES.length} · glisse du doigt ou utilise les flèches</p>
      </div>
    </div>
  );
}
