'use client';

import { useEffect, useState } from 'react';

export default function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Enregistrer le Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW enregistré:', reg.scope))
          .catch(err => console.log('Erreur enregistrement SW:', err));
      });
    }

    // Capturer l'événement d'installation
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt capturé');
    });

    // Savoir si l'app est déjà installée
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    // Vérifier si déjà en mode standalone (déjà installée)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Installation acceptée');
    } else {
      console.log('Installation refusée');
    }
    setDeferredPrompt(null);
  };

  // Si rien à installer, on n'affiche rien
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  // Le bouton flottant qui apparaîtra si Chrome permet l'installation
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <button 
        onClick={handleInstallClick}
        className="bg-emerald-500 text-white font-extrabold py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 hover:bg-emerald-600 transition-all"
      >
        <span className="text-xl">📱</span>
        Installer l'application
      </button>
    </div>
  );
}