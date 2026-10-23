// Effets plein écran de la montée de grade : éclairs (Légende), feu (Maître), pluie d'or (Grand Maître),
// et sons générés dans le navigateur (aucun fichier à télécharger). Utilisé par GradeUpOverlay et LegendLightning.

/* ===================== SON ===================== */
export function createSfx() {
  let ac: AudioContext | null = null;
  let nb: AudioBuffer | null = null;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new Ctx();
  } catch { ac = null; }

  const buf = () => {
    if (!nb && ac) {
      nb = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return nb!;
  };
  const tone = (f: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, f2?: number, lp?: number) => {
    if (!ac) return;
    const T = ac.currentTime + t0, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, T);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + dur);
    g.gain.setValueAtTime(0, T); g.gain.linearRampToValueAtTime(vol, T + 0.01); g.gain.exponentialRampToValueAtTime(0.001, T + dur);
    let n: AudioNode = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
    n.connect(g).connect(ac.destination); o.start(T); o.stop(T + dur + 0.05);
  };
  const noise = (t0: number, dur: number, o: { type?: BiquadFilterType; f0?: number; f1?: number; vol?: number; attack?: number; q?: number } = {}) => {
    if (!ac) return;
    const { type = 'lowpass', f0 = 1000, f1, vol = 0.3, attack = 0.005, q = 0.8 } = o;
    const T = ac.currentTime + t0, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf(); s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, T); if (f1) f.frequency.exponentialRampToValueAtTime(f1, T + dur);
    g.gain.setValueAtTime(0, T); g.gain.linearRampToValueAtTime(vol, T + attack); g.gain.exponentialRampToValueAtTime(0.001, T + dur);
    s.connect(f).connect(g).connect(ac.destination); s.start(T, Math.random() * 2); s.stop(T + dur + 0.05);
  };

  return {
    close() { ac?.close().catch(() => {}); ac = null; },
    beat() { tone(70, 0, 0.18, 'sine', 0.6, 40); tone(62, 0.2, 0.16, 'sine', 0.45, 38); },
    whoosh() { noise(0, 1, { type: 'bandpass', f0: 300, f1: 4000, vol: 0.22, attack: 0.6 }); },
    tick() { tone(1200, 0, 0.08, 'square', 0.04); },
    clink(p = 1) { const b = 880 * p; [1, 2.76, 5.4, 8.9].forEach((r, i) => tone(b * r, 0, 0.55 - i * 0.1, 'sine', 0.16 / (i + 1))); tone(b * 0.5, 0, 0.12, 'triangle', 0.12); noise(0, 0.05, { type: 'highpass', f0: 5000, vol: 0.12 }); },
    thunder(big = false) { noise(0, 0.22, { type: 'highpass', f0: 1800, vol: big ? 0.7 : 0.45 }); noise(0.03, big ? 3.2 : 2.2, { type: 'lowpass', f0: big ? 1200 : 800, f1: 50, vol: big ? 1 : 0.6, attack: 0.03 }); tone(44, 0, big ? 2 : 1.3, 'sine', big ? 0.7 : 0.45, 26); },
    crackle() { for (let k = 0; k < 7; k++) noise(k * 0.03 + Math.random() * 0.02, 0.03, { type: 'bandpass', f0: 2500 + Math.random() * 3000, vol: 0.22, q: 2 }); },
    roar() { noise(0, 2, { type: 'lowpass', f0: 180, f1: 1100, vol: 0.55, attack: 0.5 }); for (let k = 0; k < 10; k++) noise(0.2 + k * 0.13 + Math.random() * 0.08, 0.03, { type: 'bandpass', f0: 1800, vol: 0.15, q: 3 }); },
    fanfare() { [261.6, 329.6, 392, 523.3].forEach((f, i) => { tone(f, i * 0.07, 1.9, 'sawtooth', 0.07, undefined, 1800); tone(f * 2, i * 0.07, 1.6, 'triangle', 0.05); }); tone(65, 0, 0.9, 'sine', 0.8, 40); noise(0, 0.4, { type: 'lowpass', f0: 400, vol: 0.4 }); },
    land() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.04, 1.4, 'triangle', 0.1)); tone(55, 0, 0.5, 'sine', 0.5, 30); },
  };
}
export type Sfx = ReturnType<typeof createSfx>;

/* ===================== MOTEUR D'EFFETS (canvas) ===================== */
type Pt = [number, number];
type Bolt = { x0: number; y0: number; x1: number; y1: number; rough: number; w: number; nb: number; born: number; life: number; re: number; pts: Pt[]; br: Pt[][] };
type Part = { k: 'f' | 'e' | 'c' | 's'; x: number; y: number; vx: number; vy: number; r: number; age: number; life: number; ph: number; g: number };

function boltPts(x0: number, y0: number, x1: number, y1: number, rough: number): Pt[] {
  let pts: Pt[] = [[x0, y0], [x1, y1]], d = rough;
  for (let k = 0; k < 7; k++) {
    const n: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay) || 1, off = (Math.random() - 0.5) * d;
      n.push([(ax + bx) / 2 - ((by - ay) / len) * off, (ay + by) / 2 + ((bx - ax) / len) * off], [bx, by]);
    }
    pts = n; d *= 0.55;
  }
  return pts;
}
function sprite(c0: string, c1: string) {
  const s = document.createElement('canvas'); s.width = s.height = 64;
  const g = s.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, c0); r.addColorStop(0.4, c1); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return s;
}

export type FxMode = 'storm' | 'fire' | 'gold' | null;

export function createFx(cv: HTMLCanvasElement, opts: { center?: () => [number, number]; onStrike?: (big: boolean) => void; maxParts?: number } = {}) {
  const ctx = cv.getContext('2d')!;
  let W = 0, H = 0, raf = 0, cleared = true, alive = true;
  const SP = {
    y: sprite('rgba(255,250,220,1)', 'rgba(255,200,80,.8)'), o: sprite('rgba(255,190,90,1)', 'rgba(255,110,20,.7)'),
    r: sprite('rgba(255,110,40,.9)', 'rgba(190,30,10,.5)'), g: sprite('rgba(255,250,210,1)', 'rgba(242,193,78,.8)'),
  };
  const maxParts = opts.maxParts ?? 140;
  const st = { mode: null as FxMode, level: 0, arcs: false, auto: false, autoMin: 1300, autoMax: 2900, next: 0, nextArc: 0, bolts: [] as Bolt[], parts: [] as Part[] };
  const center = () => opts.center?.() ?? [W / 2, H * 0.42];

  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    // Sur téléphone, la barre d'adresse qui apparaît/disparaît au défilement déclenche « resize » sans arrêt :
    // on ne réalloue le canvas que si sa taille change vraiment (sinon saccades sur le profil d'une Légende).
    if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
    W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener('resize', size);

  const regen = (b: Bolt) => {
    b.pts = boltPts(b.x0, b.y0, b.x1, b.y1, b.rough); b.br = [];
    for (let k = 0; k < b.nb; k++) {
      const idx = 4 + Math.floor(Math.random() * (b.pts.length - 8)), [x, y] = b.pts[idx];
      const ang = Math.atan2(b.y1 - b.y0, b.x1 - b.x0) + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.7), len = 40 + Math.random() * 130;
      b.br.push(boltPts(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, b.rough * 0.35));
    }
  };
  const addBolt = (x0: number, y0: number, x1: number, y1: number, o: { life?: number; rough?: number; w?: number; nb?: number } = {}) => {
    const b = { x0, y0, x1, y1, rough: o.rough ?? 140, w: o.w ?? 1, nb: o.nb ?? 4, born: performance.now(), life: o.life ?? 450, re: 0, pts: [], br: [] } as Bolt;
    regen(b); st.bolts.push(b); cleared = false;
  };
  /** Éclair qui traverse tout l'écran (de haut en bas, souvent en diagonale). */
  const strike = (o: { x0?: number; x1?: number; y1?: number; big?: boolean } = {}) => {
    const x0 = o.x0 ?? Math.random() * W;
    const x1 = o.x1 ?? x0 + (x0 < W / 2 ? 1 : -1) * (0.25 + Math.random() * 0.6) * W; // en diagonale
    const y1 = o.y1 ?? H + 10;
    addBolt(x0, -10, x1, y1, { life: o.big ? 650 : 420, rough: o.big ? 170 : 130, w: o.big ? 1.6 : 1, nb: o.big ? 7 : 4 });
    opts.onStrike?.(!!o.big);
  };
  const stroke = (pts: Pt[]) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
  const drawBolt = (b: Bolt, now: number) => {
    const t = (now - b.born) / b.life; if (t >= 1) return false;
    if (now - b.re > 55) { regen(b); b.re = now; }                     // l'éclair vibre
    const a = (Math.random() < 0.22 ? 0.25 : 1) * Math.pow(1 - t, 0.6); // l'éclair scintille
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [lw, c] of [[16 * b.w, `rgba(139,92,246,${0.22 * a})`], [7 * b.w, `rgba(167,139,250,${0.5 * a})`], [2.6 * b.w, `rgba(255,255,255,${a})`]] as const) {
      ctx.lineWidth = lw; ctx.strokeStyle = c; stroke(b.pts); ctx.lineWidth = lw * 0.55; b.br.forEach(stroke);
    }
    return true;
  };
  const room = () => st.parts.length < maxParts;
  const spawnFire = (n: number, fromCenter = false) => {
    const [cx, cy] = center();
    for (let k = 0; k < n && room(); k++) {
      if (fromCenter) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5; st.parts.push({ k: 'f', x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, r: 20 + Math.random() * 24, age: 0, life: 40 + Math.random() * 25, ph: 0, g: 0 }); }
      else st.parts.push({ k: 'f', x: Math.random() * W, y: H + 20, vx: (Math.random() - 0.5) * 0.8, vy: -(3 + Math.random() * 5), r: 30 + Math.random() * 40, age: 0, life: 70 + Math.random() * 50, ph: 0, g: 0 });
    }
    cleared = false;
  };
  const spawnEmber = () => { if (room()) st.parts.push({ k: 'e', x: Math.random() * W, y: H + 5, vx: (Math.random() - 0.5) * 1.2, vy: -(1.5 + Math.random() * 2.5), r: 1.5 + Math.random() * 2, age: 0, life: 120 + Math.random() * 80, ph: Math.random() * 6, g: 0 }); };
  const spawnGold = (n: number, burst = false) => {
    const [cx, cy] = center();
    for (let k = 0; k < n && room(); k++) {
      if (burst) { const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 7; st.parts.push({ k: 'c', x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: 5 + Math.random() * 4, age: 0, life: 90, ph: Math.random() * 6, g: 0.18 }); }
      else st.parts.push({ k: Math.random() < 0.6 ? 'c' : 's', x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 2.5, r: 4 + Math.random() * 4, age: 0, life: 400, ph: Math.random() * 6, g: 0 });
    }
    cleared = false;
  };

  const loop = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (W < 10 || H < 10) size(); // écran pas encore affiché au moment de la création : on remesure
    if (!st.mode && !st.bolts.length && !st.parts.length) { if (!cleared) { ctx.clearRect(0, 0, W, H); cleared = true; } return; }
    cleared = false; ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    if (st.mode === 'storm') {
      if (st.auto && now > st.next) { strike(); st.next = now + st.autoMin + Math.random() * (st.autoMax - st.autoMin); }
      if (st.arcs && now > st.nextArc) {
        const [cx, cy] = center(), a = Math.random() * Math.PI * 2, r0 = 60, r1 = 120 + Math.random() * 60;
        addBolt(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, { life: 150, rough: 40, w: 0.6, nb: 1 });
        st.nextArc = now + 90 + Math.random() * 120;
      }
    }
    if (st.mode === 'fire') { spawnFire(Math.round(st.level * 2)); if (Math.random() < st.level * 0.6) spawnEmber(); }
    if (st.mode === 'gold' && Math.random() < st.level) spawnGold(1);
    st.bolts = st.bolts.filter(b => drawBolt(b, now));
    st.parts = st.parts.filter(p => {
      p.age++; const t = p.age / p.life; if (t >= 1 || p.y < -80 || p.y > H + 60) return false;
      p.x += p.vx; p.y += p.vy;
      if (p.k === 'f') { p.vx *= 0.98; const s = p.r * (1 - t * 0.7), img = t < 0.3 ? SP.y : t < 0.65 ? SP.o : SP.r; ctx.globalAlpha = 0.75 * (1 - t); ctx.drawImage(img, p.x - s, p.y - s, s * 2, s * 2); }
      else if (p.k === 'e') { p.x += Math.sin(p.age * 0.08 + p.ph) * 0.6; ctx.globalAlpha = 1 - t; ctx.drawImage(SP.y, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6); }
      else if (p.k === 'c') {
        p.vy += p.g; p.ph += 0.15; const w = Math.abs(Math.cos(p.ph)) * p.r + 1;
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, (1 - t) * 2);
        ctx.fillStyle = Math.cos(p.ph) > 0 ? '#f2c14e' : '#fff1b8'; ctx.beginPath(); ctx.ellipse(p.x, p.y, w, p.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#9a6a12'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalCompositeOperation = 'lighter';
      } else { p.ph += 0.2; const s = p.r * (0.6 + 0.6 * Math.abs(Math.sin(p.ph))); ctx.globalAlpha = 0.9; ctx.drawImage(SP.g, p.x - s * 2, p.y - s * 2, s * 4, s * 4); }
      return true;
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  raf = requestAnimationFrame(loop);

  return {
    st, size, addBolt, strike, spawnFire, spawnGold, center,
    get W() { return W; }, get H() { return H; },
    stop() { Object.assign(st, { mode: null, level: 0, arcs: false, auto: false, bolts: [], parts: [] }); },
    destroy() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', size); },
  };
}
export type Fx = ReturnType<typeof createFx>;
