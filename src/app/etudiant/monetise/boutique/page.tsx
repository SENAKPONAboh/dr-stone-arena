import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import BoutiqueClient from '@/components/monetise/BoutiqueClient';
import MonetiseNav from '@/components/monetise/MonetiseNav';
import { getOrCreateShopCatalog } from '@/lib/monetise-shop';

export default async function BoutiquePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  // Catalogue auto-créé au premier affichage (zéro manipulation admin)
  const items = await getOrCreateShopCatalog();

  const inventory = await prisma.userInventory.findMany({
    where: { userId: user.id },
    include: { item: true },
  });

  // État de la Flamme (protection / perte) pour les boutons « Utiliser »
  const flameState = await prisma.user.findUnique({
    where: { id: user.id },
    select: { flameProtectedUntil: true, flameLostAt: true, streakBeforeReset: true },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a05] via-[#1a1308] to-[#0f0a05] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <MonetiseNav passActive={true} />
        <BoutiqueClient
          items={items.map(i => ({ id: i.id, name: i.name, category: i.category, priceUA: i.priceUA, icon: i.icon, description: i.description }))}
          inventory={inventory.map(inv => ({
            itemId: inv.itemId, name: inv.item.name, icon: inv.item.icon,
            quantity: inv.quantity, category: inv.item.category, effectKey: inv.item.effectKey,
          }))}
          uaBalance={user.uaBalance}
          flameProtectedUntil={flameState?.flameProtectedUntil?.toISOString() ?? null}
          flameLostAt={flameState?.flameLostAt?.toISOString() ?? null}
          lostStreak={flameState?.streakBeforeReset ?? 0}
        />
      </div>
    </div>
  );
}