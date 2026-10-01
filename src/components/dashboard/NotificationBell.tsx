'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';

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

  const handleMarkAsRead = async () => {
    if (count === 0) return;
    setCount(0); // Optimistic UI update
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
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
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-slab shadow-xl">
          <div className="border-b border-line p-3 font-display text-sm font-bold text-ink">Notifications</div>
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
