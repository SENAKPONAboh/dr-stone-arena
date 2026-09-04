'use client';

import { useState } from 'react';

type Slide = { icon: string; title: string; paragraphs: string[]; highlight?: string };

const SLIDES: Slide[] = [
  {
    icon: '🩺', title: 'Bienvenue dans Doctor Stone Arena',
    paragraphs: [
      'Ton apprentissage médical devient une véritable aventure.',
      'Doctor Stone Arena est une plateforme d\'apprentissage médical gamifiée conçue pour te permettre de réviser, progresser et tester tes connaissances à travers des cas cliniques inspirés de ton programme d\'études.',
      'Ici, tu ne te contentes pas de lire un cours ou de répondre à des questions.',
    ],
    highlight: 'Tu entres dans l\'Arena.',
  },
  {
    icon: '🎯', title: 'Ton objectif',
    paragraphs: [
      'Devenir le meilleur médecin possible, tout en progressant dans l\'Arena.',
      'Tu vas résoudre des cas cliniques correspondant à ton niveau d\'études, gagner de l\'expérience, améliorer tes performances et gravir progressivement les différents niveaux de la plateforme.',
      'Ton niveau détermine le type de cas cliniques auxquels tu es confronté.',
    ],
    highlight: '1ère → 2ème → 3ème → 4ème → 5ème → 6ème année → Médecin',
  },
  {
    icon: '🧠', title: 'Comment se déroule une partie ?',
    paragraphs: [
      'Lorsque tu commences un défi, un cas clinique t\'est présenté. Tu dois analyser la situation, interpréter les informations disponibles et choisir la meilleure réponse parmi les propositions.',
      'Les réponses sont présentées sous forme de QCM à choix A, B, C ou D.',
      'Après ta réponse, tu découvres immédiatement si elle est correcte et tu peux consulter l\'explication médicale du cas afin de comprendre le raisonnement attendu.',
    ],
    highlight: 'L\'objectif n\'est pas seulement de trouver la bonne réponse. C\'est de comprendre pourquoi elle est correcte.',
  },
  {
    icon: '❤️', title: 'Les vies',
    paragraphs: [
      'Chaque joueur dispose d\'un nombre limité de vies.',
      'Une mauvaise réponse peut te faire perdre une vie. Lorsque tu n\'as plus de vie, tu dois attendre leur régénération avant de pouvoir continuer normalement.',
      'Cela t\'encourage à prendre le temps d\'analyser les cas plutôt que de répondre au hasard.',
    ],
  },
  {
    icon: '⭐', title: 'L\'expérience et la progression',
    paragraphs: [
      'En jouant, tu gagnes de l\'XP.',
      'Ton expérience te permet de suivre ta progression dans l\'Arena et de faire évoluer ton profil. Tes performances sont également prises en compte dans les différents éléments de progression et de compétition de la plateforme.',
    ],
    highlight: 'Chaque cas résolu contribue à ton aventure.',
  },
  {
    icon: '🔥', title: 'Les séries et les défis',
    paragraphs: [
      'Ta régularité compte.',
      'Doctor Stone Arena propose différents défis et mécaniques destinés à t\'encourager à revenir régulièrement, maintenir ta progression et tester tes connaissances : défis quotidiens, défis à plus long terme et autres objectifs à accomplir.',
    ],
  },
  {
    icon: '⚔️', title: 'Les Duels',
    paragraphs: [
      'L\'Arena ne se limite pas à jouer seul.',
      'Les joueurs Premium peuvent participer à des duels contre d\'autres étudiants. Un duel oppose deux joueurs du même niveau autour de 5 cas cliniques identiques, issus des cas déjà publiés dans l\'Arena.',
      'Le joueur qui obtient le meilleur résultat remporte le duel et gagne des Points Arena.',
    ],
    highlight: 'Les défaites ne font pas perdre de vie.',
  },
  {
    icon: '🏆', title: 'Les classements',
    paragraphs: [
      'Tu peux suivre ta position dans l\'Arena grâce aux classements.',
      'Compare ta progression au classement global, ou aux étudiants de ton niveau.',
    ],
  },
  {
    icon: '💰', title: 'La compétition mensuelle',
    paragraphs: [
      'À la fin de chaque mois, les meilleurs joueurs du classement peuvent être sélectionnés pour participer à une compétition spéciale (Top 10).',
      'Ces joueurs peuvent alors tenter de remporter une récompense financière pouvant aller jusqu\'à 30 000 FCFA.',
    ],
    highlight: 'Une possibilité motivante : reste dans le haut du classement !',
  },
  {
    icon: '🎖️', title: 'Les badges',
    paragraphs: [
      'Tes accomplissements peuvent te permettre de débloquer différents badges : régularité, performances, défis, duels...',
    ],
    highlight: 'Les badges s\'obtiennent par tes actions. Ils ne s\'achètent pas.',
  },
  {
    icon: '🎁', title: 'Les coffres',
    paragraphs: [
      'Au cours de ton aventure, tu peux également obtenir des coffres.',
      'Ils représentent une autre forme de récompense dans l\'Arena et peuvent contenir différents éléments selon leur niveau.',
    ],
  },
  {
    icon: '💎', title: 'Premium',
    paragraphs: [
      'Doctor Stone Arena propose plusieurs niveaux de Premium : régénération des vies plus rapide, accès aux duels, éléments cosmétiques et fonctionnalités supplémentaires selon le niveau.',
      'Premium apporte principalement du confort et davantage de possibilités.',
    ],
    highlight: 'Premium ne donne AUCUN avantage médical ou compétitif injuste : pas de réponses, pas de questions simplifiées, pas d\'XP ou de Points Arena artificiels.',
  },
  {
    icon: '🚀', title: 'Entre dans l\'Arena',
    paragraphs: [
      'Analyse les cas. Apprends de tes erreurs. Progresse régulièrement.',
      'Affronte tes rivaux. Gravis les classements.',
    ],
    highlight: 'Deviens meilleur qu\'hier. Bienvenue dans Doctor Stone Arena. 🩺⚔️',
  },
];

export default function OnboardingCarousel({ prenom }: { prenom: string }) {
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    setFinishing(true);
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      window.location.href = '/etudiant';
    } catch (e) {
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-2xl mb-4">🧠</div>
          <p className="text-emerald-300 font-bold tracking-widest uppercase text-xs">Dr. Stone Arena</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 text-white min-h-[380px] flex flex-col">
          <div className="text-5xl mb-4">{slide.icon}</div>
          <h2 className="text-2xl font-extrabold mb-4">{slide.title}</h2>

          <div className="space-y-3 flex-1">
            {slide.paragraphs.map((p, i) => (
              <p key={i} className="text-white/80 leading-relaxed">{p}</p>
            ))}
            {slide.highlight && (
              <p className="text-emerald-300 font-bold text-lg leading-relaxed pt-2">{slide.highlight}</p>
            )}
          </div>

          {isLast && (
            <p className="text-center text-white/50 text-sm mt-4">Prêt à commencer, {prenom} ?</p>
          )}

          <div className="flex items-center gap-2 mt-8">
            {index > 0 && (
              <button onClick={() => setIndex(i => i - 1)}
                className="py-3 px-5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all">
                ← Précédent
              </button>
            )}
            <div className="flex-1 flex justify-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/30'}`} />
              ))}
            </div>
            {isLast ? (
              <button onClick={finish} disabled={finishing}
                className="py-3 px-6 bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-500 hover:to-blue-600 text-white font-extrabold rounded-2xl text-sm shadow-lg transition-all disabled:opacity-50 uppercase tracking-wide">
                {finishing ? '...' : '🚀 Commencer'}
              </button>
            ) : (
              <button onClick={() => setIndex(i => i + 1)}
                className="py-3 px-6 bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-500 hover:to-blue-600 text-white font-extrabold rounded-2xl text-sm shadow-lg transition-all">
                Suivant →
              </button>
            )}
          </div>
          <p className="text-center text-white/40 text-xs mt-3">Étape {index + 1} / {SLIDES.length}</p>
        </div>
      </div>
    </div>
  );
}