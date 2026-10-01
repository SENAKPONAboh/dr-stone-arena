'use client';

import { useEffect, useState } from 'react';

// Convertit la clé publique VAPID (base64url) au format attendu par le navigateur
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status =
  | 'loading'
  | 'unsupported'      // navigateur sans notifications push
  | 'ios-install'      // iPhone : il faut d'abord installer l'app sur l'écran d'accueil
  | 'no-key'           // clé publique absente de la configuration
  | 'denied'           // permission refusée dans le navigateur
  | 'off'              // prêt à activer
  | 'on';              // activé sur cet appareil

export default function PushNotificationManager() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState<'' | 'enable' | 'test' | 'disable'>('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const getRegistration = async () => {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    await navigator.serviceWorker.register('/sw.js');
    return navigator.serviceWorker.ready;
  };

  // Envoie l'abonnement au serveur (échoue si le serveur le refuse)
  const sendToServer = async (sub: PushSubscription) => {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    return res.ok;
  };

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    if (!supported) { setStatus(isIOS && !standalone ? 'ios-install' : 'unsupported'); return; }
    if (!publicKey) { setStatus('no-key'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    (async () => {
      try {
        const reg = await getRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === 'granted') {
          // Auto-réparation : on s'assure que le serveur connaît bien cet appareil
          sendToServer(sub).catch(() => {});
          setStatus('on');
        } else {
          setStatus('off');
        }
      } catch {
        setStatus('off');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = async () => {
    if (busy) return;
    setBusy('enable');
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const reg = await getRegistration();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!),
        });
      }
      if (!(await sendToServer(sub))) {
        setMessage({ type: 'err', text: "Le serveur n'a pas pu enregistrer cet appareil. Réessaie dans un instant." });
        return;
      }
      setStatus('on');
      setMessage({ type: 'ok', text: 'Notifications activées ! Appuie sur « Tester » pour vérifier.' });
    } catch (e: any) {
      setMessage({ type: 'err', text: `Activation impossible : ${e?.message ?? 'erreur inconnue'}` });
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    if (busy) return;
    setBusy('test');
    setMessage(null);
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      setMessage(res.ok
        ? { type: 'ok', text: 'Notification envoyée ! Elle doit apparaître dans quelques secondes.' }
        : { type: 'err', text: data?.error ?? 'Échec du test.' });
      if (!res.ok && (data?.reason === 'EXPIRED' || data?.reason === 'NO_SUBSCRIPTION')) setStatus('off');
    } catch {
      setMessage({ type: 'err', text: 'Impossible de joindre le serveur.' });
    } finally {
      setBusy('');
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy('disable');
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
      await fetch('/api/notifications/unsubscribe', { method: 'POST' });
      setStatus('off');
      setMessage({ type: 'ok', text: 'Notifications désactivées sur cet appareil.' });
    } catch {
      setMessage({ type: 'err', text: 'Impossible de désactiver pour le moment.' });
    } finally {
      setBusy('');
    }
  };

  const btn = 'rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50';
  const help = 'text-xs leading-relaxed text-mute';

  return (
    <div className="w-full space-y-2 text-left">
      {status === 'loading' && <p className={help}>Vérification des notifications…</p>}

      {status === 'unsupported' && (
        <p className={help}>Ce navigateur ne gère pas les notifications. Essaie avec Chrome (Android / PC) ou installe l'application.</p>
      )}

      {status === 'ios-install' && (
        <p className={help}>
          📱 Sur iPhone, installe d'abord l'application : dans Safari, touche <b className="text-ink">Partager</b> puis
          <b className="text-ink"> « Sur l'écran d'accueil »</b>. Ouvre ensuite l'app depuis son icône : le bouton d'activation apparaîtra ici.
        </p>
      )}

      {status === 'no-key' && (
        <p className={help}>🔧 Les notifications ne sont pas encore configurées (clé manquante). L'administrateur doit les activer.</p>
      )}

      {status === 'denied' && (
        <p className={help}>
          🚫 Tu as bloqué les notifications pour ce site. Pour les réactiver : touche le cadenas à côté de l'adresse (ou les réglages du site),
          puis <b className="text-ink">Notifications → Autoriser</b>, et recharge la page.
        </p>
      )}

      {status === 'off' && (
        <>
          <p className={help}>Reçois une alerte quand on te défie en duel ou quand un nouveau cas est publié.</p>
          <button onClick={enable} disabled={!!busy} className={`${btn} w-full bg-mala text-stone shadow-[0_3px_0_#0f7a4f] active:translate-y-0.5`}>
            {busy === 'enable' ? '⏳ Activation…' : '🔔 Activer les notifications'}
          </button>
        </>
      )}

      {status === 'on' && (
        <>
          <p className="text-xs font-bold text-mala">🔔 Notifications activées sur cet appareil</p>
          <div className="flex gap-2">
            <button onClick={test} disabled={!!busy} className={`${btn} flex-1 border border-mala/40 bg-mala/10 text-mala`}>
              {busy === 'test' ? '⏳ Envoi…' : 'Tester'}
            </button>
            <button onClick={disable} disabled={!!busy} className={`${btn} flex-1 border border-line bg-slab-2 text-mute`}>
              {busy === 'disable' ? '⏳…' : 'Désactiver'}
            </button>
          </div>
        </>
      )}

      {message && (
        <p className={`text-xs font-semibold ${message.type === 'ok' ? 'text-mala' : 'text-heart'}`}>{message.text}</p>
      )}
    </div>
  );
}
