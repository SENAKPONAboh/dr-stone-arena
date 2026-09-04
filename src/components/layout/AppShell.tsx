'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import NotificationBell from '@/components/dashboard/NotificationBell';
import { getPlanLabel } from '@/lib/premium';
import { getNiveauLabel } from '@/lib/niveau';

type AppShellUser = {
  prenom: string; nom: string; pseudo: string | null; imageUrl: string | null;
  xp: number; lives: number; streak: number;
  anneeEtude: number | null;
  isPremium: boolean; premiumTier: number | null;
};

const NAV_ITEMS = [
  { href: '/etudiant', label: 'Accueil', icon: '🏠' },
  { href: '/etudiant/arene', label: 'Arène', icon: '⚔️' },
  { href: '/etudiant/leaderboard', label: 'Classement', icon: '🏆' },
  { href: '/etudiant/profil', label: 'Profil', icon: '👤' },
  { href: '/etudiant/premium', label: 'Premium', icon: '💎' },
];

export default function AppShell({
  user, notifications, unreadCount, children
}: {
  user: AppShellUser;
  notifications: { id: string; message: string; icon: string; isRead: boolean; createdAt: Date }[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const premium = user.isPremium;

  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`;
  const isActive = (href: string) =>
    href === '/etudiant' ? pathname === '/etudiant' : pathname.startsWith(href);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${premium
      ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800'
      : 'bg-gray-50 dark:bg-slate-900'}`}>

      {/* ===== SIDEBAR (desktop) ===== */}
      <aside className={`hidden md:flex fixed inset-y-0 left-0 w-56 flex-col z-40 border-r transition-colors duration-300 ${premium
        ? 'bg-slate-900/90 backdrop-blur-xl border-yellow-400/20'
        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>

        <div className="p-5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center text-xl shadow-lg">🧠</div>
          <div className="min-w-0">
            <p className={`font-extrabold text-sm truncate ${premium ? 'text-white' : 'text-gray-800 dark:text-white'}`}>Dr. Stone Arena</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">L'Arène Médicale</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${isActive(item.href)
                ? premium ? 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/30' : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                : premium ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={`p-4 border-t text-xs ${premium ? 'border-white/10 text-white/40' : 'border-gray-100 dark:border-slate-700 text-gray-400'}`}>
          <p className="font-bold">{premium ? '👑' : '🆓'} {premium ? getPlanLabel(user.premiumTier) : 'Compte Gratuit'}</p>
          <p className="mt-1">{getNiveauLabel(user.anneeEtude)}</p>
        </div>
      </aside>

      {/* ===== CONTENU ===== */}
      <div className="md:ml-56">

        {/* HEADER (HUD) */}
        <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${premium
          ? 'bg-slate-900/80 backdrop-blur-xl border-yellow-400/20'
          : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center text-sm">🧠</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-orange-100 dark:bg-orange-900/40 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-300 flex items-center gap-1">🔥 {user.streak}</span>
              <span className="bg-emerald-100 dark:bg-emerald-900/40 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-1">⭐ {user.xp}</span>
              <span className="bg-red-100 dark:bg-red-900/40 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">❤️ {user.lives}</span>
              {premium && (
                <span className="hidden sm:inline-block bg-yellow-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">👑 {getPlanLabel(user.premiumTier)}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell initialNotifications={notifications as any} unreadCount={unreadCount} />
              <Link href="/etudiant/profil" className="ml-1">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="Profile" className={`w-9 h-9 rounded-full object-cover ${premium ? 'border-2 border-yellow-400' : 'border-2 border-emerald-500'}`} />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${premium ? 'bg-blue-500 text-white border-2 border-yellow-400' : 'bg-blue-500 text-white border-2 border-blue-200'}`}>
                    {initials}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 pb-24 md:pb-8 max-w-6xl mx-auto">
          {children}
        </main>
      </div>

      {/* ===== BOTTOM BAR (mobile) ===== */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t transition-colors duration-300 ${premium
        ? 'bg-slate-900/95 backdrop-blur-xl border-yellow-400/20'
        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center py-2">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive(item.href)
                ? premium ? 'text-yellow-300' : 'text-blue-600 dark:text-blue-300'
                : premium ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}