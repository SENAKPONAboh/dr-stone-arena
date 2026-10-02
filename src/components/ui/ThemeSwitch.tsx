'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Icon from './Icon';

// Choix du thème (sombre / clair). Mémorisé sur l'appareil.
// variant "icon"  : petit bouton rond (en-tête, pages de connexion)
// variant "full"  : deux grands choix avec aperçu (page Profil)
export default function ThemeSwitch({ variant = 'icon', className = '' }: { variant?: 'icon' | 'full'; className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme === 'light' ? 'light' : 'dark') : 'dark';

  if (variant === 'icon') {
    const next = current === 'dark' ? 'light' : 'dark';
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={current === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
        title={current === 'dark' ? 'Thème clair' : 'Thème sombre'}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-line bg-slab text-mute transition-colors hover:text-ink ${className}`}
      >
        <Icon name={current === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
    );
  }

  const option = (value: 'dark' | 'light', label: string, preview: string, text: string) => {
    const active = current === value;
    return (
      <button
        type="button"
        onClick={() => setTheme(value)}
        aria-pressed={active}
        className={`flex-1 rounded-2xl border-2 p-3 text-left transition-all ${active ? 'border-mala shadow-[0_0_0_3px_rgb(var(--mala-rgb)/0.2)]' : 'border-line'}`}
      >
        <span className="mb-2 flex h-14 items-end gap-1 rounded-xl p-2" style={{ background: preview }}>
          <span className="h-2 w-8 rounded-full" style={{ background: text, opacity: 0.9 }} />
          <span className="h-2 w-5 rounded-full bg-[#2fd28a]" />
        </span>
        <span className="flex items-center justify-between text-sm font-bold text-ink">
          {label}
          {active && <span className="text-mala"><Icon name="check" size={16} /></span>}
        </span>
      </button>
    );
  };

  return (
    <div className={`flex gap-3 ${className}`}>
      {option('dark', 'Sombre', '#0d1311', '#e9f1ed')}
      {option('light', 'Clair', '#f1f5f3', '#12211b')}
    </div>
  );
}
