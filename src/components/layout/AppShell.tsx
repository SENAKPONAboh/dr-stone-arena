'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion } from 'framer-motion';
import NotificationBell from '@/components/dashboard/NotificationBell';
import HudPill from '@/components/ui/HudPill';
import Icon, { type IconName } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import BackgroundCells from '@/components/ui/BackgroundCells';
import { getPlanLabel } from '@/lib/premium';
import { getNiveauLabel } from '@/lib/niveau';

type AppShellUser = {
  prenom: string; nom: string; pseudo: string | null; imageUrl: string | null;
  xp: number; lives: number; streak: number;
  anneeEtude: number | null;
  isPremium: boolean; premiumTier: number | null;
};

const NAV_ITEMS_BASE: { href: string; label: string; icon: IconName }[] = [
  { href: '/etudiant', label: 'Accueil', icon: 'home' },
  { href: '/etudiant/arene', label: 'Arène', icon: 'swords' },
  { href: '/etudiant/leaderboard', label: 'Classement', icon: 'trophy' },
  { href: '/etudiant/profil', label: 'Profil', icon: 'user' },
  { href: '/etudiant/premium', label: 'Premium', icon: 'gem' },
];

export default function AppShell({
  user, notifications, unreadCount, unreadMessages, isAmbassador, children
}: {
  user: AppShellUser;
  notifications: { id: string; message: string; icon: string; isRead: boolean; createdAt: Date }[];
  unreadCount: number;
  unreadMessages: number;
  isAmbassador?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const premium = user.isPremium;

  const NAV_ITEMS = [
    ...NAV_ITEMS_BASE,
    ...(isAmbassador ? [{ href: '/ambassadeur', label: 'Ambassadeur', icon: 'shield' as IconName }] : []),
  ];

  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`;
  const isActive = (href: string) =>
    href === '/etudiant' ? pathname === '/etudiant' : pathname.startsWith(href);

  const PremiumBadge = ({ className = '' }: { className?: string }) => (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-stone ${className}`}>
      <Icon name="crown" size={12} /> {getPlanLabel(user.premiumTier)}
    </span>
  );

  return (
    <div className="arena-skin relative min-h-screen bg-stone font-body text-ink">
      <BackgroundCells />

      {/* ===== SIDEBAR (desktop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-line bg-stone/95 backdrop-blur md:flex">
        <div className="flex items-center gap-3 border-b border-line p-5">
          <Logo size={40} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold text-ink">Dr. Stone Arena</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-mala">L'Arène Médicale</p>
          </div>
        </div>

        <LayoutGroup id="side-nav">
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map(item => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${active ? 'text-mala' : 'text-mute hover:text-ink'}`}>
                  {active && (
                    <motion.span layoutId="side-indicator" className="absolute inset-0 rounded-2xl border border-mala/30 bg-mala/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <span className="relative"><Icon name={item.icon} size={22} /></span>
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="space-y-1 border-t border-line p-4 text-xs text-mute">
          {premium ? <PremiumBadge /> : <p className="font-bold">Compte Classique</p>}
          <p className="pt-1">{getNiveauLabel(user.anneeEtude)}</p>
          <div className="pt-2"><ThemeSwitch /></div>
        </div>
      </aside>

      {/* ===== CONTENU ===== */}
      <div className="relative md:ml-56">

        {/* HEADER (HUD) */}
        <header className="sticky top-0 z-40 border-b border-line bg-stone/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
            <div className="md:hidden"><Logo size={34} /></div>

            <div className="flex items-center gap-1.5">
              <HudPill kind="flame" value={user.streak} />
              <HudPill kind="xp" value={user.xp} />
              <HudPill kind="lives" value={user.lives} />
              {premium && <PremiumBadge className="hidden sm:inline-flex" />}
            </div>

            <div className="flex items-center gap-2">
              <ThemeSwitch className="hidden sm:flex" />
              <Link href="/etudiant/messages" className="relative flex-shrink-0 text-mute transition-colors hover:text-ink" title="Messages" aria-label="Messages">
                <Icon name="chat" size={24} />
                {unreadMessages > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-mala px-1 font-display text-[9px] font-extrabold text-stone">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <NotificationBell initialNotifications={notifications as any} unreadCount={unreadCount} />
              <Link href="/etudiant/profil" className="ml-0.5">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="Profil" className={`h-9 w-9 rounded-full object-cover border-2 ${premium ? 'border-gold' : 'border-mala'}`} />
                ) : (
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-slab-2 font-display text-xs font-bold text-ink ${premium ? 'border-gold' : 'border-mala'}`}>
                    {initials}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-8">
          {children}
        </main>
      </div>

      {/* ===== BARRE DU BAS (mobile) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-stone/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <LayoutGroup id="bottom-nav">
          <div className="flex items-center justify-around py-1.5">
            {NAV_ITEMS.map(item => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5 transition-colors ${active ? 'text-mala' : 'text-mute'}`}>
                  {active && (
                    <motion.span layoutId="bottom-indicator" className="absolute -top-1.5 h-1 w-8 rounded-full bg-mala"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  <motion.span animate={active ? { y: [0, -6, 0], scale: [1, 1.2, 1] } : { y: 0, scale: 1 }}
                    transition={{ duration: 0.4 }} key={active ? 'on' : 'off'}>
                    <Icon name={item.icon} size={24} />
                  </motion.span>
                  <span className="font-display text-[9px] font-bold uppercase tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </LayoutGroup>
      </nav>
    </div>
  );
}
