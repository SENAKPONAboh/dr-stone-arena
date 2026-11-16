'use client';

// Fenêtre de trophée affichée une fois à la connexion (les 3 premiers de la Ligue Or).
import { useState } from 'react';

const RANK = ['', '1ʳᵉ place', '2ᵉ place', '3ᵉ place'];

export default function TrophyPopup({ popupKey, title, subtitle, xp, rank }: { popupKey: string; title: string; subtitle: string; xp: number; rank: number }) {
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    fetch('/api/ligue/trophee-vu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: popupKey }) }).catch(() => {});
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <style>{`
        @keyframes tp-in { from { opacity: 0; transform: scale(.85) translateY(20px) } to { opacity: 1; transform: none } }
        @keyframes tp-trophy { 0% { transform: translateY(-40px) scale(.6) rotate(-12deg); opacity: 0 } 60% { transform: translateY(6px) scale(1.08) rotate(4deg); opacity: 1 } 100% { transform: none } }
        @keyframes tp-glow { 0%,100% { opacity: .55; transform: scale(1) } 50% { opacity: .9; transform: scale(1.08) } }
        @keyframes tp-spin { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) { .tp-anim { animation: none !important } }
      `}</style>
      <div className="tp-anim relative w-full max-w-sm overflow-hidden rounded-[2rem] border-2 border-[#f2c14e] text-center text-white shadow-[0_0_80px_rgba(242,193,78,0.35)]"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, #3a2a08 0%, #140f05 55%, #0a0803 100%)', animation: 'tp-in .45s cubic-bezier(.2,.9,.3,1.2) both' }}>
        <div className="tp-anim pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'repeating-conic-gradient(rgba(242,193,78,.18) 0deg 8deg, transparent 8deg 22deg)', animation: 'tp-spin 18s linear infinite' }} />
        <div className="relative px-6 pb-7 pt-8">
          <div className="relative mx-auto h-32 w-32">
            <div className="tp-anim absolute inset-0 rounded-full bg-[#f2c14e] blur-2xl" style={{ animation: 'tp-glow 2.4s ease-in-out infinite' }} />
            <svg className="tp-anim relative" viewBox="0 0 64 64" width="128" height="128" style={{ animation: 'tp-trophy .8s .15s cubic-bezier(.2,.9,.3,1.2) both' }} aria-hidden>
              <defs><linearGradient id="tpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor="#f2c14e" /><stop offset="1" stopColor="#a8740f" /></linearGradient></defs>
              <path d="M18 8h28v10a14 14 0 0 1-28 0z" fill="url(#tpg)" />
              <path d="M18 12H9a9 9 0 0 0 10 10M46 12h9a9 9 0 0 1-10 10" fill="none" stroke="#f2c14e" strokeWidth="3.5" />
              <rect x="28" y="31" width="8" height="10" fill="#c99316" />
              <rect x="20" y="41" width="24" height="7" rx="2" fill="url(#tpg)" />
              <rect x="16" y="48" width="32" height="7" rx="2" fill="#7a540a" />
              <path d="M32 13l2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7z" fill="#fff8dc" />
            </svg>
          </div>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.3em] text-[#f2c14e]">Trophée · {RANK[rank] ?? ''}</p>
          <h2 className="mt-1 font-display text-2xl font-black leading-tight">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{subtitle}</p>
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#f2c14e] px-5 py-2 font-display text-lg font-black text-[#2b1d03] shadow-[0_6px_0_#8a5d10]">+{xp} XP</div>
          <button onClick={close} className="mt-6 block w-full rounded-2xl bg-white/10 py-3 font-bold transition-transform active:scale-95 hover:bg-white/15">Merci ! 🙌</button>
        </div>
      </div>
    </div>
  );
}
