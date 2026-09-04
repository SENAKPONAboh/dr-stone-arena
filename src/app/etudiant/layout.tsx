import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';

export default async function EtudiantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'ADMIN') redirect('/admin');
  if (user.role === 'CORRECTEUR') redirect('/correcteur');

  // Première connexion : onboarding obligatoire (une seule fois)
  if (!user.onboardingCompleted) redirect('/onboarding');

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AppShell
      user={{
        prenom: user.prenom, nom: user.nom, pseudo: user.pseudo, imageUrl: user.imageUrl,
        xp: user.xp, lives: user.lives, streak: user.streak,
        anneeEtude: user.anneeEtude, isPremium: user.isPremium, premiumTier: user.premiumTier
      }}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}