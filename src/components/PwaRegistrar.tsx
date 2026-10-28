'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Enregistre le Service Worker et propose d'installer l'application :
// - Android / PC (Chrome, Edge) : bouton « Installer l'application » (+ « Plus tard »)
// - iPhone / iPad (Safari, Chrome, Edge, Firefox) : petit guide pas à pas « Partager → Sur l'écran d'accueil »
// - Lien ouvert dans Facebook, Instagram, TikTok, Messenger… : on explique d'ouvrir le vrai navigateur,
//   car ces navigateurs intégrés ne savent pas installer d'application.

type Hint = 'ios-safari' | 'ios-other' | 'in-app' | null;

const SNOOZE_KEY = 'pwa-install-snooze';
const SNOOZE_DAYS = 3;

function snoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return until > Date.now();
  } catch { return false; }
}

function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch { /* stockage indisponible */ }
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5" aria-hidden="true">
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export default function PwaRegistrar() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hint, setHint] = useState<Hint>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Service Worker
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(err => console.log('Erreur enregistrement SW:', err));
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) { setIsInstalled(true); return; }
    if (snoozed()) setHidden(true);

    // Chrome / Edge : l'installation est proposée par le navigateur
    const onPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); setHint(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const inApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|musical_ly|BytedanceWebview|TikTok|Snapchat|Line\/|Twitter/i.test(ua);
    if (inApp) setHint('in-app');
    else if (isIOS) {
      const otherBrowser = /crios|fxios|edgios|opios/i.test(ua);
      setHint(otherBrowser ? 'ios-other' : 'ios-safari');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const later = () => { snooze(); setHidden(true); };

  // Pas pendant l'intro animée, ni dans le panel admin / correcteur
  if (isInstalled || hidden) return null;
  if (pathname === '/' || pathname?.startsWith('/admin') || pathname?.startsWith('/correcteur')) return null;

  // Connexion / inscription : en haut, pour ne jamais cacher le formulaire ni son bouton
  const onTop = !pathname?.startsWith('/etudiant');
  const pos = onTop ? 'top-3' : 'bottom-20 md:bottom-4';

  if (deferredPrompt) {
    return (
      <div className={`fixed ${pos} left-1/2 z-50 flex -translate-x-1/2 items-center gap-2`}>
        <button
          onClick={install}
          className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[#2fd28a] px-5 py-3 font-extrabold text-[#0d1311] shadow-[0_5px_0_#0f7a4f,0_10px_30px_rgba(0,0,0,0.5)] transition-transform active:translate-y-1"
        >
          <span className="text-xl">📱</span>
          Installer l'application
        </button>
        <button
          onClick={later}
          aria-label="Plus tard"
          className="grid h-10 w-10 place-items-center rounded-full border border-[#26332e] bg-[#151d1a] text-lg font-bold text-[#8fa39a] shadow-lg"
        >
          ×
        </button>
      </div>
    );
  }

  if (!hint) return null;

  return (
    <div className={`fixed ${pos} inset-x-3 z-50 mx-auto max-w-md rounded-2xl border border-[#26332e] bg-[#151d1a] p-4 text-[#e9f1ed] shadow-2xl`}>
      <p className="mb-2 text-sm font-extrabold">📱 Installe Dr. Stone Arena sur ton téléphone</p>

      {hint === 'in-app' && (
        <p className="text-xs leading-relaxed text-[#8fa39a]">
          Tu as ouvert le lien depuis une application (Facebook, TikTok…) qui ne peut pas installer Arena.
          Touche les <b className="text-[#e9f1ed]">trois points ⋯</b> en haut, puis
          <b className="text-[#e9f1ed]"> « Ouvrir dans le navigateur »</b> (Safari sur iPhone, Chrome sur Android).
        </p>
      )}

      {hint === 'ios-safari' && (
        <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[#8fa39a]">
          <li>Touche <b className="text-[#e9f1ed]">Partager <ShareIcon /></b> en bas de Safari
            (sur les iPhone récents : touche d'abord <b className="text-[#e9f1ed]">⋯</b> en bas à droite).</li>
          <li>Descends et choisis <b className="text-[#e9f1ed]">« Sur l'écran d'accueil »</b>.</li>
          <li>Touche <b className="text-[#e9f1ed]">Ajouter</b> : l'icône Arena apparaît avec tes autres applis.</li>
        </ol>
      )}

      {hint === 'ios-other' && (
        <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[#8fa39a]">
          <li>Touche <b className="text-[#e9f1ed]">Partager <ShareIcon /></b> (en haut à droite, près de la barre d'adresse).</li>
          <li>Choisis <b className="text-[#e9f1ed]">« Sur l'écran d'accueil »</b> puis <b className="text-[#e9f1ed]">Ajouter</b>.</li>
          <li>Si tu ne le vois pas, ouvre <b className="text-[#e9f1ed]">dr-stone-arena.vercel.app</b> dans <b className="text-[#e9f1ed]">Safari</b>.</li>
        </ol>
      )}

      {hint !== 'in-app' && (
        <p className="mt-2 text-[11px] text-[#8fa39a]">Ensuite, ouvre Arena depuis cette icône : plein écran et notifications.</p>
      )}
      <button onClick={later} className="mt-3 w-full rounded-xl bg-[#1c2723] py-2 text-xs font-bold text-[#e9f1ed]">Plus tard</button>
    </div>
  );
}
