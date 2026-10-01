'use client';

import { useEffect, useState } from 'react';

// Enregistre le Service Worker et propose d'installer l'application :
// - Android / PC (Chrome, Edge) : bouton « Installer l'application »
// - iPhone / iPad (Safari) : petit guide « Partager → Sur l'écran d'accueil »
export default function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Service Worker
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(err => console.log('Erreur enregistrement SW:', err));
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) { setIsInstalled(true); return; }

    // Chrome / Edge : l'installation est proposée par le navigateur
    const onPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); setShowIosHint(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iPhone / iPad (Safari) : pas d'invite automatique, on explique le geste (une seule fois)
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome/i.test(ua);
    if (isIOS && isSafari) {
      let dismissed = false;
      try { dismissed = localStorage.getItem('ios-install-hint') === '1'; } catch { /* stockage indisponible */ }
      if (!dismissed) setShowIosHint(true);
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

  const dismissIos = () => {
    try { localStorage.setItem('ios-install-hint', '1'); } catch { /* ignoré */ }
    setShowIosHint(false);
  };

  if (isInstalled) return null;

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-4">
        <button
          onClick={install}
          className="flex items-center gap-2 rounded-full bg-[#2fd28a] px-6 py-3 font-extrabold text-[#0d1311] shadow-[0_5px_0_#0f7a4f,0_10px_30px_rgba(0,0,0,0.5)] transition-transform active:translate-y-1"
        >
          <span className="text-xl">📱</span>
          Installer l'application
        </button>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-[#26332e] bg-[#151d1a] p-4 text-[#e9f1ed] shadow-2xl">
        <p className="mb-1 text-sm font-extrabold">📱 Installe Dr. Stone Arena</p>
        <p className="text-xs leading-relaxed text-[#8fa39a]">
          Touche <b className="text-[#e9f1ed]">Partager</b> (le carré avec une flèche, en bas de Safari) puis
          <b className="text-[#e9f1ed]"> « Sur l'écran d'accueil »</b>. Tu auras l'application en plein écran, avec les notifications.
        </p>
        <button onClick={dismissIos} className="mt-3 w-full rounded-xl bg-[#1c2723] py-2 text-xs font-bold text-[#e9f1ed]">J'ai compris</button>
      </div>
    );
  }

  return null;
}
