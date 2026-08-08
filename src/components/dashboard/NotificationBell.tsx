'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && count > 0) handleMarkAsRead();
        }} 
        className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 font-bold text-gray-800">Notifications</div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">Aucune notification pour le moment.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 border-b border-gray-50 flex gap-2 ${n.isRead ? 'bg-white' : 'bg-blue-50'}`}>
                  <span className="text-lg">{n.icon}</span>
                  <div>
                    <p className="text-sm text-gray-700">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
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