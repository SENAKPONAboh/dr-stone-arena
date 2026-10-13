'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { XP_GRADES, type XpGrade } from '@/lib/grades';
import { createFx, createSfx, type Fx, type Sfx } from '@/lib/grade-fx';
import GradeInsignia from './GradeInsignia';

// Plein écran « NOUVEAU GRADE », inspiré des montées de rang de Call of Duty Mobile :
// 1. échelle des grades, la barre d'XP se remplit  2. noir + battement ECG
// 3. ouverture propre au grade (éclairs / pluie d'or / feu)  4. l'insigne (GradeInsignia) s'assemble en tournant, pièce par pièce (« clic » à chaque pièce)
// 5. atterrissage + nom du grade  6. retour à l'échelle des grades, confettis, bouton Continuer.

const sleepFactory = (alive: () => boolean) => (ms: number) =>
  new Promise<void>((res, rej) => setTimeout(() => (alive() ? res() : rej(new Error('stop'))), ms));

export default function GradeUpOverlay({ from, to, onClose }: { from: XpGrade; to: XpGrade; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(0);

  const [phase, setPhase] = useState<'ladder' | 'show' | 'final'>('ladder');
  const [colorsOf, setColorsOf] = useState<XpGrade>(from);
  const [barFull, setBarFull] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [black, setBlack] = useState(false);
  const [ecg, setEcg] = useState(false);
  const [rays, setRays] = useState(false);
  const [halo, setHalo] = useState(false);
  const [text, setText] = useState(false);
  const [sparks, setSparks] = useState<{ dx: number; dy: number; d: number }[]>([]);
  const [confettis, setConfettis] = useState<CSSProperties[]>([]);

  const fxRef = useRef<Fx | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const top = to.index >= 5;

  const flash = useCallback((color: string, o: number, d: number) => {
    const f = flashRef.current; if (!f) return;
    f.style.background = color; f.style.setProperty('--fo', String(o)); f.style.setProperty('--fd', d + 's');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }, []);
  const quake = useCallback(() => {
    const r = rootRef.current; if (!r) return;
    r.classList.remove('gfx-quake'); void r.offsetWidth; r.classList.add('gfx-quake');
  }, []);
  const wave = useCallback(() => {
    const w = waveRef.current; if (!w) return;
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  }, []);

  const ambient = useCallback(() => {
    const fx = fxRef.current; if (!fx) return;
    if (to.index === 7) Object.assign(fx.st, { mode: 'storm', auto: true, arcs: false, next: performance.now() + 900 });
    else if (to.index === 6) Object.assign(fx.st, { mode: 'gold', level: 0.25 });
    else if (to.index === 5) Object.assign(fx.st, { mode: 'fire', level: 0.6 });
  }, [to.index]);

  const finale = useCallback(() => {
    setColorsOf(to); setPhase('final'); setBlack(false); setEcg(false); setRays(true); setText(false); setHalo(false);
    setShakeKey(k => k + 1);
    const cols = [to.from, to.to, '#2fd28a', '#f2c14e'];
    setConfettis(Array.from({ length: 30 }, (_, k) => ({
      left: `${Math.random() * 100}%`, background: cols[k % 4],
      '--x': `${(Math.random() - 0.5) * 160}px`, '--r': `${(Math.random() - 0.5) * 1080}deg`,
      '--t': `${2.2 + Math.random() * 1.6}s`, '--d': `${Math.random() * 0.6}s`,
    } as CSSProperties)));
    if (fxRef.current) { fxRef.current.st.bolts = []; fxRef.current.st.arcs = false; }
    ambient();
  }, [to, ambient]);

  const skip = useCallback(() => { runRef.current++; finale(); }, [finale]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = ++runRef.current;
    const alive = () => id === runRef.current;
    const wait = sleepFactory(alive);
    if (reduce) { finale(); return () => { runRef.current++; }; }

    const sfx = createSfx(); sfxRef.current = sfx;
    const fx = createFx(cvRef.current!, {
      onStrike: big => { flash(big ? '#ffffff' : '#c4b5fd', big ? 0.95 : 0.6, big ? 0.6 : 0.35); quake(); sfx.thunder(big); },
    });
    fxRef.current = fx;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const assemble = (): number => {
      const spin = spinRef.current!;
      const dur = top ? 1900 : 1300, step = dur / 7;
      spin.animate([{ transform: 'rotateY(1080deg) scale(.6)' }, { transform: 'rotateY(0deg) scale(1.25)' }], { duration: dur, easing: 'cubic-bezier(.22,.65,.2,1)', fill: 'forwards' });
      const piece = (sel: string, from: string, delay: number, d = 480) => spin.querySelectorAll<SVGElement>(sel).forEach((el, k) =>
        el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: d, delay: delay + k * 140, easing: 'cubic-bezier(.25,1.45,.45,1)', fill: 'both' }));
      piece('.gi-aura', 'scale(.3)', 0, 600);
      piece('.gi-frame', 'scale(2.4)', 0);
      piece('.gi-ring', 'scale(0) rotate(-220deg)', step);
      piece('.gi-plate', 'scale(.2)', step * 1.6, 420);
      piece('.gi-emb', 'translateY(-60px) scale(2.2)', step * 2.4);
      piece('.gi-wl', 'scaleX(0) rotate(30deg)', step * 3.2, 600);
      piece('.gi-wr', 'scaleX(0) rotate(-30deg)', step * 3.2, 600);
      piece('.gi-spk', 'translateY(-120px) scaleY(1.6)', step * 4.2, 460);
      piece('.gi-star', 'scale(3) rotate(-120deg)', step * 5, 420);
      [0, 1, 1.6, 2.4].forEach((d, k) => timers.push(setTimeout(() => {
        if (!alive()) return; sfx.clink(0.8 + k * 0.25); if (k === 3 && to.index === 7) sfx.crackle();
      }, d * step + 380)));
      if (to.index >= 3) timers.push(setTimeout(() => { if (alive()) sfx.whoosh(); }, step * 3.2 + 100));
      spin.querySelectorAll('.gi-star').forEach((_, k) => timers.push(setTimeout(() => { if (alive()) sfx.clink(1.8 + k * 0.2); }, step * 5 + k * 140 + 300)));
      return dur;
    };

    (async () => {
      try {
        await wait(500);
        setBarFull(true);
        let n = 0; const iv = setInterval(() => { if (!alive() || ++n > 8) { clearInterval(iv); return; } sfx.tick(); }, 110);
        await wait(1000); setShakeKey(k => k + 1);
        await wait(500); setBlack(true);
        await wait(450); setPhase('show'); setEcg(true);
        await wait(560); sfx.beat();
        await wait(640); setColorsOf(to); setEcg(false);

        // --- Ouverture propre au grade ---
        if (to.index === 7) { // ORAGE : de vrais éclairs traversent tout l'écran
          fx.st.mode = 'storm';
          fx.strike({ x0: fx.W * 0.1, x1: fx.W * 0.45 }); await wait(380);
          fx.strike({ x0: fx.W * 0.92, x1: fx.W * 0.5 }); await wait(330);
          const [cx, cy] = fx.center(); fx.strike({ x0: fx.W * 0.5, x1: cx, y1: cy, big: true }); await wait(120);
          fx.st.arcs = true;
        } else if (to.index === 6) { flash('#fff1b8', 0.8, 0.6); Object.assign(fx.st, { mode: 'gold', level: 0.9 }); }
        else if (to.index === 5) { flash('#ff9a3d', 0.7, 0.6); Object.assign(fx.st, { mode: 'fire', level: 1.6 }); sfx.roar(); }
        else flash('#ffffff', 0.9, 0.5);

        // --- La médaille s'assemble en tournant ---
        heroRef.current!.style.opacity = '1'; setRays(true); sfx.whoosh();
        if (to.index === 7) Object.assign(fx.st, { auto: true, next: performance.now() + 700 });
        await wait(assemble());

        // --- Atterrissage ---
        spinRef.current!.animate([{ transform: 'rotateY(0deg) scale(1.25)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: 650, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'forwards' });
        setHalo(true); wave(); quake(); sfx.land();
        setSparks(Array.from({ length: 26 }, (_, i) => { const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.3, r = 100 + Math.random() * 100; return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, d: Math.random() * 80 }; }));
        if (to.index === 7) {
          fx.st.auto = false;
          const [cx, cy] = fx.center();
          fx.addBolt(cx, -10, cx, cy - 70, { life: 700, rough: 120, w: 2, nb: 6 });
          fx.addBolt(cx, cy, -10, cy + Math.random() * 120, { life: 600, rough: 90, w: 1.2, nb: 3 });
          fx.addBolt(cx, cy, fx.W + 10, cy - Math.random() * 120, { life: 600, rough: 90, w: 1.2, nb: 3 });
          flash('#ffffff', 1, 0.7); sfx.thunder(true);
        }
        if (to.index === 6) { // la couronne de pointes de l'insigne vient de se poser : pluie d'or et fanfare
          wave(); fx.spawnGold(40, true); sfx.fanfare(); flash('#fff1b8', 0.7, 0.5); fx.st.level = 0.45;
        }
        if (to.index === 5) { fx.spawnFire(60, true); sfx.roar(); fx.st.level = 1.4; flash('#ff7a1a', 0.6, 0.5); }
        await wait(700);
        bobRef.current?.classList.add('breathe'); setText(true);
        if (to.index === 7) Object.assign(fx.st, { auto: true, next: performance.now() + 600 });
        await wait(top ? 3000 : 2300);

        // --- Retour à l'échelle des grades ---
        setText(false); heroRef.current?.classList.add('out'); setHalo(false); fx.st.arcs = false;
        await wait(380);
        finale();
      } catch { /* animation interrompue (Passer / fermeture) */ }
    })();

    return () => { runRef.current++; timers.forEach(clearTimeout); fx.destroy(); sfx.close(); fxRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = phase === 'final' ? to : from;
  const prev = XP_GRADES[cur.index - 1];
  const next = XP_GRADES[cur.index + 1];
  const pct = phase === 'final' ? 0.03 : barFull ? 1 : 0.82;
  const xpShown = phase === 'final' ? to.min : barFull ? to.min : Math.round(from.min + (to.min - from.min) * 0.82);
  const vars = { '--gfx-from': colorsOf.from, '--gfx-to': colorsOf.to, '--gfx-glow': colorsOf.glow } as CSSProperties;

  return (
    <div ref={rootRef} className="gfx-root gfx-bg fixed inset-0 z-[120] overflow-hidden font-body text-ink" style={vars} role="dialog" aria-label="Nouveau grade">
      <p className={`gfx-fade absolute left-0 right-0 top-5 text-center font-display text-[11px] font-bold tracking-[0.35em] text-mute ${black ? 'opacity-0' : ''}`}>SAISON EN COURS</p>

      {/* Échelle des grades : précédent · actuel · suivant */}
      <div className="gfx-ladder" style={{ opacity: phase === 'show' ? 0 : 1 }}>
        <div className="gfx-slot side">
          {prev && <><GradeInsignia grade={prev} size={64} animated={false} /><p className="font-display text-[10.5px] font-bold leading-tight">{prev.name}</p></>}
        </div>
        <div key={shakeKey} className={`gfx-slot center ${shakeKey ? 'gfx-shake' : ''}`}>
          <div className="grid h-[150px] place-items-center"><GradeInsignia grade={cur} size={128} /></div>
          <p className="font-display text-[10.5px] font-bold leading-tight">{cur.name}</p>
          {next && (
            <>
              <div className="gfx-bar"><i style={{ transform: `scaleX(${pct})` }} /></div>
              <p className="text-[11px] font-semibold tabular-nums text-mute">{xpShown.toLocaleString('fr-FR')} / {(phase === 'final' ? next.min : to.min).toLocaleString('fr-FR')} XP</p>
            </>
          )}
        </div>
        <div className={`gfx-slot side ${next ? 'locked' : ''}`}>
          {next ? <><GradeInsignia grade={next} size={64} locked /><p className="font-display text-[10.5px] font-bold leading-tight">???</p></>
            : <><div className="grid h-[64px] place-items-center text-3xl">🏔️</div><p className="font-display text-[10.5px] font-bold leading-tight">Sommet atteint</p></>}
        </div>
      </div>

      <div className={`gfx-fade pointer-events-none absolute inset-0 bg-black ${black ? 'opacity-100' : 'opacity-0'}`} />
      <svg className={`gfx-ecg pointer-events-none absolute left-0 right-0 top-[42%] h-[120px] w-full -translate-y-1/2 ${ecg ? 'on' : 'opacity-0'}`} viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
        <path pathLength={1} d="M0,50 L110,50 L122,50 L132,40 L142,50 L160,50 L170,58 L184,6 L198,94 L208,50 L226,50 L238,43 L250,50 L400,50" />
      </svg>

      <div className="gfx-stage">
        <div className={`gfx-rays ${rays ? 'on' : ''}`} />
        <div className={`gfx-halo ${halo ? 'on' : ''}`} />
        <div ref={waveRef} className="gfx-wave" />
        {sparks.map((s, i) => <i key={i} className="gfx-spark" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, animationDelay: `${s.d}ms` } as CSSProperties} />)}
        {phase !== 'final' && (
          <div ref={heroRef} className="gfx-hero">
            <div ref={bobRef} className="gfx-bob"><div ref={spinRef} className="gfx-spin grid place-items-center"><GradeInsignia grade={to} size={210} animated /></div></div>
          </div>
        )}
      </div>

      <canvas ref={cvRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

      <div className="pointer-events-none absolute left-4 right-4 top-[calc(42%+130px)] z-[3] text-center">
        <p className={`gfx-kicker font-display text-[11px] font-bold tracking-[0.3em] text-mala ${text ? 'gfx-show' : ''}`}>NOUVEAU GRADE</p>
        <h2 className={`gfx-name mb-2 mt-2.5 min-h-[28px] font-display text-2xl font-extrabold leading-tight ${text ? 'on' : ''}`}>
          {text && to.name.split(' ').map((w, i) => <Fragment key={i}>{i > 0 && ' '}<span style={{ '--i': i } as CSSProperties}>{w}</span></Fragment>)}
        </h2>
        <p className={`gfx-tag text-[15px] font-semibold text-[#c9d6d0] ${text ? 'gfx-show' : ''}`}>{to.tagline}</p>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettis.map((s, i) => <i key={i} className="gfx-cf" style={s} />)}
      </div>
      <div ref={flashRef} className="gfx-flash pointer-events-none absolute inset-0 opacity-0" />

      {phase !== 'final' && (
        <button onClick={skip} className="absolute right-3.5 top-3.5 z-[5] rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-mute">Passer ›</button>
      )}
      <button
        onClick={onClose}
        className={`gfx-continue absolute inset-x-6 bottom-7 z-[4] mx-auto max-w-sm rounded-2xl bg-mala py-4 font-display text-sm font-bold text-[#04140c] shadow-[0_5px_0_#0f7a4f] ${phase === 'final' ? 'gfx-show' : ''}`}
      >
        CONTINUER
      </button>
    </div>
  );
}
