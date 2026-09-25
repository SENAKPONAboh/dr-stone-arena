'use client';

import { useEffect, useState } from 'react';

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    if (loading || isSubscribed) return; // anti double-clic
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Permission (l'utilisateur doit valider la popup navigateur — peut prendre du temps)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Permission refusée. Active les notifications dans les réglages de ton navigateur.');
        return;
      }

      // 2. Création de l'abonnement (requête réseau)
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // 3. Enregistrement côté serveur
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) {
        setError("L'activation a échoué. Réessaie.");
        return;
      }

      setIsSubscribed(true);
      setSuccess('Notifications activées ! 🔔');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError("Erreur lors de l'activation. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <button
        onClick={subscribeToPush}
        disabled={loading || isSubscribed}
        className={`w-full text-xs font-bold py-2 px-3 rounded-xl border transition-all mb-1 ${isSubscribed
          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
          : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 disabled:opacity-50'}`}
      >
        {loading ? '⏳ Activation en cours...' : isSubscribed ? '🔔 Notifications activées' : '🔔 Activer les notifications'}
      </button>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      {success && <p className="text-emerald-500 text-xs text-center">{success}</p>}
    </div>
  );
}