'use client';

import { useState } from 'react';

type Props = {
  type: 'profil' | 'jour';
  label?: string;
  className?: string;
};

const shareText = (type: 'profil' | 'jour', url: string) => type === 'jour'
  ? `J'ai terminé ma garde du jour sur Dr. Stone Arena 🩺 Viens me défier : ${url}`
  : `Mon profil sur Dr. Stone Arena 🩺 Rejoins-moi dans l'Arène : ${url}`;

// Partage d'une belle carte image (profil ou score du jour) : WhatsApp, Instagram, TikTok…
// 1) Partage natif du téléphone avec l'image  2) sinon téléchargement de l'image.
export default function ShareButton({ type, label, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const share = async () => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const res = await fetch(`/api/share/card?type=${type}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('card');
      const blob = await res.blob();
      const fileName = type === 'jour' ? 'dr-stone-arena-garde-du-jour.png' : 'dr-stone-arena-profil.png';
      const file = new File([blob], fileName, { type: 'image/png' });
      const url = window.location.origin;
      const text = shareText(type, url);

      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], text, title: 'Dr. Stone Arena' });
          setState('done');
          return;
        } catch (e) {
          // L'utilisateur a fermé la fenêtre de partage : ce n'est pas une erreur
          if (e instanceof DOMException && e.name === 'AbortError') { setState('idle'); return; }
        }
      }

      // Repli : téléchargement de l'image
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      setState('done');
    } catch {
      setState('error');
    } finally {
      setTimeout(() => setState(s => (s === 'loading' ? s : 'idle')), 2500);
    }
  };

  const text = state === 'loading' ? 'Préparation…'
    : state === 'done' ? 'Prêt à partager ✓'
    : state === 'error' ? 'Réessaie'
    : (label ?? (type === 'jour' ? 'Partager mon score' : 'Partager mon profil'));

  const openWhatsApp = () => {
    const link = `https://wa.me/?text=${encodeURIComponent(shareText(type, window.location.origin))}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-3">
    <button
      type="button"
      onClick={share}
      disabled={state === 'loading'}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-slab-2 px-5 py-3 font-display text-sm font-bold uppercase tracking-wide text-ink shadow-[0_5px_0_rgb(var(--line-rgb))] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_rgb(var(--line-rgb))] disabled:opacity-60 ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {text}
    </button>
    <button
      type="button"
      onClick={openWhatsApp}
      aria-label="Envoyer sur WhatsApp"
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3 font-display text-sm font-bold uppercase tracking-wide text-[#0b2e17] shadow-[0_5px_0_#168a43] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#168a43]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z"/></svg>
      WhatsApp
    </button>
    </span>
  );
}
