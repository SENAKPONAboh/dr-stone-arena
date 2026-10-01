'use client';

// PAGE TEMPORAIRE (étape 1) : sert à vérifier la charte sur téléphone. À supprimer avant l'étape 2.
import { useState } from 'react';
import ArenaButton from '@/components/ui/ArenaButton';
import HudPill from '@/components/ui/HudPill';
import AnswerOption, { type AnswerState } from '@/components/ui/AnswerOption';
import ProgressPath from '@/components/ui/ProgressPath';
import TimerRing from '@/components/ui/TimerRing';
import ResultSheet from '@/components/ui/ResultSheet';
import EcgLine from '@/components/ui/EcgLine';
import BackgroundCells from '@/components/ui/BackgroundCells';
import Logo from '@/components/ui/Logo';
import Icon, { type IconName } from '@/components/ui/Icon';

const ICONS: IconName[] = ['flame', 'heart', 'star', 'trophy', 'swords', 'user', 'home', 'shield', 'chest', 'stethoscope', 'ecg', 'brain', 'cell'];

export default function DemoUi() {
  const [xp, setXp] = useState(120);
  const [lives, setLives] = useState(5);
  const [done, setDone] = useState(3);
  const [pick, setPick] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [t, setT] = useState(30);

  const stateOf = (l: string): AnswerState => {
    if (!sheet) return pick === l ? 'selected' : 'idle';
    if (l === 'B') return 'correct';
    return pick === l ? 'wrong' : 'dimmed';
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-stone font-body text-ink">
      <BackgroundCells />
      <div className="relative mx-auto max-w-md space-y-8 px-4 pb-40 pt-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex-1">
            <h1 className="font-display text-xl font-extrabold">Dr. Stone Arena</h1>
            <EcgLine className="h-6" />
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold text-mute">HUD</h2>
          <div className="flex flex-wrap gap-2">
            <HudPill kind="flame" value={9} />
            <HudPill kind="xp" value={xp} />
            <HudPill kind="lives" value={lives} />
            <HudPill kind="elite" value={2000} />
          </div>
          <div className="flex gap-2">
            <ArenaButton onClick={() => setXp((v) => v + 10)}>+10 XP</ArenaButton>
            <ArenaButton variant="danger" onClick={() => setLives((v) => Math.max(0, v - 1))}>-1 vie</ArenaButton>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold text-mute">Boutons</h2>
          <ArenaButton full>Continuer</ArenaButton>
          <ArenaButton full variant="gold">Espace Élite</ArenaButton>
          <ArenaButton full variant="ghost">Plus tard</ArenaButton>
          <ArenaButton full disabled>Désactivé</ArenaButton>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold text-mute">Icônes</h2>
          <div className="flex flex-wrap gap-3 text-mala">
            {ICONS.map((n) => <Icon key={n} name={n} size={30} />)}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-mute">Réponses</h2>
            <TimerRing remaining={t} total={30} />
          </div>
          <input type="range" min={0} max={30} value={t} onChange={(e) => setT(Number(e.target.value))} className="w-full" />
          {['A', 'B', 'C', 'D'].map((l) => (
            <AnswerOption key={l} letter={l} state={stateOf(l)} disabled={sheet} onClick={() => setPick(l)}>
              Réponse {l} : un énoncé de test{'\n'}sur deux lignes
            </AnswerOption>
          ))}
          <ArenaButton full disabled={!pick || sheet} onClick={() => setSheet(true)}>Valider</ArenaButton>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold text-mute">Parcours du jour</h2>
          <ProgressPath done={done} />
          <ArenaButton full variant="ghost" onClick={() => setDone((d) => (d >= 10 ? 0 : d + 1))}>Cas suivant</ArenaButton>
        </section>
      </div>

      <ResultSheet
        open={sheet}
        correct={pick === 'B'}
        action={<ArenaButton full onClick={() => { setSheet(false); setPick(null); }}>Continuer</ArenaButton>}
      >
        Explication de démonstration : la bonne réponse est B.
      </ResultSheet>
    </div>
  );
}
