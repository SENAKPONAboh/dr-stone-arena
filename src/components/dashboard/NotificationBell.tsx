'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import PushNotificationManager from '@/components/dashboard/PushNotificationManager';

type Notification = {
  id: string;
  message: string;
  icon: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell({ initialNotifications, unreadCount }: { initialNotifications: Notification[], unreadCount: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [count, setCount] = useState(unreadCount);
  const boxRef = useRef<HTMLDivElement>(null);

  // Les nouvelles notifications reçues après un rafraîchissement de la page remplacent l'état local
  useEffect(() => { setNotifications(initialNotifications); }, [initialNotifications]);
  useEffect(() => { setCount(unreadCount); }, [unreadCount]);

  // Fermer en touchant à côté ou avec Échap
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const handleMarkAsRead = async () => {
    if (count === 0) return;
    setCount(0); // Optimistic UI update
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && count > 0) handleMarkAsRead();
        }}
        className="relative p-1.5 text-mute transition-colors hover:text-ink"
      >
        <Icon name="bell" size={24} className={count > 0 ? 'animate-flame-flicker' : ''} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-heart px-1 font-display text-[9px] font-extrabold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-3 right-3 top-14 z-50 overflow-hidden rounded-2xl border border-line bg-slab shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-line p-3">
            <span className="font-display text-sm font-bold text-ink">Notifications</span>
            <button onClick={() => setIsOpen(false)} aria-label="Fermer" className="text-mute hover:text-ink">
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Activation des alertes sur cet appareil */}
          <div className="border-b border-line bg-slab-2/50 p-3">
            <PushNotificationManager />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-mute">Aucune notification pour le moment.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`flex gap-2 border-b border-line p-3 ${n.isRead ? 'bg-slab' : 'bg-mala/10'}`}>
                  <span className="text-lg">{n.icon}</span>
                  <div>
                    <p className="text-sm text-ink">{n.message}</p>
                    <p className="mt-1 text-xs text-mute">{new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
