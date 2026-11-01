import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';
import { persistLostFlame } from '@/lib/flame';

export default async function EtudiantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role === 'ADMIN') redirect('/admin');
  if (user.role === 'CORRECTEUR') redirect('/correcteur');

  // Première connexion : onboarding obligatoire (une seule fois)
  if (!user.onboardingCompleted) redirect('/onboarding');

  const [avatar, notifications, ambassadorProfile, unreadMessages] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { imageUrl: true, streak: true, lastActive: true, flameProtectedUntil: true } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.ambassador.findUnique({ where: { userId: user.id }, select: { status: true } }),
    prisma.directMessage.count({ where: { recipientId: user.id, isRead: false } })
  ]);
  // Jour manqué sans protection : la Flamme s'éteint aussi en base (classements, profils, Restaure-Flamme 48 h)
  if (avatar) await persistLostFlame({ id: user.id, ...avatar }).catch(e => console.error('Extinction de Flamme :', e));
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isAmbassador = ambassadorProfile?.status === 'ACTIF';

  return (
    <AppShell
      user={{
        prenom: user.prenom, nom: user.nom, pseudo: user.pseudo, imageUrl: avatar?.imageUrl ?? null,
        xp: user.xp, lives: user.lives, streak: user.streak,
        anneeEtude: user.anneeEtude, isPremium: user.isPremium, premiumTier: user.premiumTier
      }}
      notifications={notifications}
      unreadCount={unreadCount}
      unreadMessages={unreadMessages}
      isAmbassador={isAmbassador}
    >
      {children}
    </AppShell>
  );
}