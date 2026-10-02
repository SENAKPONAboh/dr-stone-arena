'use client';
// PAGE DE DÉMO TEMPORAIRE — à supprimer, ne pas committer
import ArenaButton from '@/components/ui/ArenaButton';
import AnswerOption from '@/components/ui/AnswerOption';
import HudPill from '@/components/ui/HudPill';
import GradeBadge from '@/components/ui/GradeBadge';
import GradeEmblem from '@/components/ui/GradeEmblem';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import SeasonPalmares from '@/components/ui/SeasonPalmares';
import GradeUpOverlay from '@/components/ui/GradeUpOverlay';
import { XP_GRADES } from '@/lib/grades';
import { useState } from 'react';

export default function Demo() {
  const [up, setUp] = useState(false);
  return (
    <div className="arena-skin min-h-screen bg-stone p-4 text-ink">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-extrabold">Démo thèmes</h1>
          <ThemeSwitch />
        </div>
        <ThemeSwitch variant="full" />
        <div className="flex gap-2"><HudPill kind="flame" value={9} /><HudPill kind="xp" value={320} /><HudPill kind="lives" value={4} /></div>
        <div className="rounded-3xl border border-line bg-slab p-4 space-y-3">
          <ArenaButton full>Valider</ArenaButton>
          <ArenaButton full variant="ghost">Plus tard</ArenaButton>
          <AnswerOption letter="A" state="idle">Réponse neutre</AnswerOption>
          <AnswerOption letter="B" state="correct">Bonne réponse</AnswerOption>
          <AnswerOption letter="C" state="wrong">Mauvaise réponse</AnswerOption>
        </div>
        <div className="flex flex-wrap gap-2">{XP_GRADES.map(g => <GradeBadge key={g.key} grade={g} />)}</div>
        <div className="flex gap-3">{[XP_GRADES[2], XP_GRADES[5], XP_GRADES[7]].map(g => <GradeEmblem key={g.key} grade={g} size={72} />)}</div>
        <SeasonPalmares own summary={{ total: 3, seasons: [{ season: '2026-09', xp: 3100, gradeIndex: 7, rank: 1 }, { season: '2026-08', xp: 2500, gradeIndex: 6, rank: 2 }, { season: '2026-07', xp: 3050, gradeIndex: 7, rank: 1 }], gradeCounts: { 7: 2, 6: 1 } }} />
        {/* Carte « ancien style » pour vérifier que le thème clair est lisible */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="font-extrabold text-gray-800">Ancienne carte (classes claires)</p>
          <p className="text-sm text-gray-500">Texte secondaire gris</p>
          <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">Récap paiement : <b>Premium II — 1 500 FCFA</b></div>
        </div>
        <ArenaButton full variant="gold" onClick={() => setUp(true)}>Voir l'animation de grade</ArenaButton>
      </div>
      {up && <GradeUpOverlay from={XP_GRADES[4]} to={XP_GRADES[5]} onClose={() => setUp(false)} />}
    </div>
  );
}
