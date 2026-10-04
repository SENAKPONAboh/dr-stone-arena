'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CaseGuard from '@/components/ui/CaseGuard';
import AnswerOption from '@/components/ui/AnswerOption';
import ArenaButton from '@/components/ui/ArenaButton';
import TimerRing from '@/components/ui/TimerRing';
import LastSecondsAlert from '@/components/ui/LastSecondsAlert';
import type { TournoiCasePayload } from '@/lib/tournoi-case';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DIFF: Record<string, string> = { FACILE: 'bg-mala/15 text-mala', MOYEN: 'bg-flame/15 text-flame', DIFFICILE: 'bg-heart/15 text-heart' };

// Écran de jeu du tournoi : une seule tentative, un cas après l'autre.
// Aucune correction n'est montrée (ni juste/faux) : tout est dévoilé à la clôture du tournoi.
export default function TournoiPlayClient({
  tournamentId, title, total, initialIndex, initialCase, closesAtLabel, startDone,
}: {
  tournamentId: string; title: string; total: number; initialIndex: number;
  initialCase: TournoiCasePayload | null; closesAtLabel: string; startDone: boolean;
}) {
  const [current, setCurrent] = useState<TournoiCasePayload | null>(initialCase);
  const [index, setIndex] = useState(initialIndex);
  const [timeLeft, setTimeLeft] = useState(initialCase?.durationMax ?? 0);
  const [selected, setSelected] = useState<string | null>(null);
  const [guardReady, setGuardReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(startDone);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Le serveur note l'heure de départ du cas et renvoie le temps restant réel
  const startCase = useCallback(async () => {
    try {
      const res = await fetch('/api/tournoi/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); return; }
      if (data.done) { setFinished(true); return; }
      setTimeLeft(data.remaining);
      setStarted(true);
    } catch {
      setError('Impossible de joindre le serveur. Vérifie ta connexion.');
    }
  }, [tournamentId]);

  useEffect(() => {
    if (guardReady && !finished && !started) startCase();
  }, [guardReady, finished, started, startCase]);

  const submit = useCallback(async (timeout = false, violation = false) => {
    if (!current || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tournoi/answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, caseId: current.id, answer: timeout || violation ? '' : (selected ?? '') }),
      });
      const data = await res.json();
      if (res.status === 409) { window.location.reload(); return; }
      if (!res.ok) { setError(data?.error || 'Erreur serveur'); submittingRef.current = false; setSaving(false); return; }
      if (data.done) { setFinished(true); return; }
      // Cas suivant : affiché tout de suite, le chrono du serveur démarre aussitôt
      setCurrent(data.next);
      setIndex(data.index);
      setSelected(null);
      setStarted(false);
      setTimeLeft(data.next?.durationMax ?? 0);
      submittingRef.current = false;
      setSaving(false);
    } catch {
      setError('Impossible de joindre le serveur. Vérifie ta connexion puis réessaie.');
      submittingRef.current = false;
      setSaving(false);
    }
  }, [current, selected, tournamentId]);

  // Chronomètre
  useEffect(() => {
    if (!guardReady || !started || finished || saving) return;
    if (timeLeft <= 0) { submit(true); return; }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, guardReady, started, finished, saving, submit]);

  if (finished) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <motion.div initial={{ scale: 0.4, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gold/15 text-5xl">🏆</motion.div>
        <h1 className="font-display text-2xl font-black text-ink">Tournoi terminé !</h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Toutes tes réponses sont enregistrées. Les résultats et les corrections seront publiés après la clôture ({closesAtLabel}).
          Les bonnes réponses restent secrètes d'ici là pour que personne ne puisse les souffler aux finalistes qui n'ont pas encore joué.
        </p>
        <Link href="/etudiant/tournoi" className="mt-6 inline-block rounded-2xl bg-mala px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
          Voir le tournoi
        </Link>
      </div>
    );
  }

  if (!current) return null;

  return (
    <CaseGuard
      resetKey={current.id}
      armed={guardReady && started && !saving}
      onAcknowledge={() => setGuardReady(true)}
      onViolation={() => submit(false, true)}
      rules={
        <>
          <p>🏆 <b>Une seule tentative.</b> {total} cas, un après l'autre, chronométrés par le serveur.</p>
          <p>🔒 Si tu quittes cette page pendant un cas → <b>le cas est annulé</b> (réponse fausse).</p>
          <p>⏱️ Fermer l'application ne redonne pas de temps : le chrono continue.</p>
          <p>🙈 Aucune correction pendant le tournoi : tout est dévoilé à la clôture.</p>
        </>
      }
    >
      <LastSecondsAlert remaining={timeLeft} active={guardReady && started && !saving} />
      <div className="relative min-h-[80vh] pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold">{title}</span>
              <h1 className="mt-1 font-display text-lg font-extrabold leading-snug text-ink">{current.title}</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-mute">{current.subject} • {current.chapter}</span>
            </div>
            <TimerRing remaining={timeLeft} total={current.durationMax} />
          </div>

          <div className="mb-1 flex gap-0.5">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-gold' : i === index ? 'bg-sky' : 'bg-slab-2'}`} />
            ))}
          </div>
          <p className="mb-4 text-xs font-bold text-mute">Cas {index + 1}/{total}</p>

          <div className="rounded-3xl border border-line bg-slab p-5">
            <div className="mb-4 flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${DIFF[current.difficulty] ?? 'bg-slab-2 text-mute'}`}>{current.difficulty}</span>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">🏆 Tournoi</span>
            </div>
            <p className="whitespace-pre-line font-body text-[16px] leading-relaxed text-ink">{current.statement}</p>
          </div>

          <div className="mt-5 space-y-3">
            {current.options.map((option, i) => (
              <AnswerOption key={`${current.id}-${i}`} letter={LETTERS[i]} state={selected === option ? 'selected' : 'idle'} disabled={saving || !started} onClick={() => setSelected(option)}>
                {option}
              </AnswerOption>
            ))}
          </div>

          {error && <p className="mt-4 rounded-2xl border border-heart/40 bg-heart/10 p-3 text-center text-sm font-bold text-heart">{error}</p>}

          <ArenaButton full className="mt-6" onClick={() => submit(false)} disabled={!selected || saving || !started}>
            {saving ? 'Enregistrement…' : index + 1 >= total ? 'Valider et terminer' : 'Valider et passer au suivant'}
          </ArenaButton>
        </div>
      </div>
    </CaseGuard>
  );
}
