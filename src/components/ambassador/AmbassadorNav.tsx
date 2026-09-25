'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/ambassadeur', label: 'Dashboard', icon: '📊' },
  { href: '/ambassadeur/code', label: 'Mon code', icon: '🔑' },
  { href: '/ambassadeur/utilisateurs', label: 'Mes utilisateurs', icon: '👥' },
  { href: '/ambassadeur/abonnements', label: 'Mes abonnements', icon: '💎' },
  { href: '/ambassadeur/commissions', label: 'Mes commissions', icon: '💰' },
];

export default function AmbassadorNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-3">
      <div className="flex flex-wrap gap-2">
        {ITEMS.map(item => {
          const active = item.href === '/ambassadeur' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`py-2 px-4 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wide transition-all ${active
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {item.icon} {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}