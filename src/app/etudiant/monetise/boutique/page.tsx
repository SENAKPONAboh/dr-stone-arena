import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import BoutiqueClient from '@/components/monetise/BoutiqueClient';
import MonetiseNav from '@/components/monetise/MonetiseNav';
import { getOrCreateShopCatalog } from '@/lib/monetise-shop';
import { getOrCreatePersonalisationCatalog } from '@/lib/personnalisation';

export default async function BoutiquePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  const [shopItems, persoItems] = await Promise.all([
    getOrCreateShopCatalog(),
    getOrCreatePersonalisationCatalog(),
  ]);
  const items = [...shopItems, ...persoItems];

  const inventory = await prisma.userInventory.findMany({
    where: { userId: user.id },
    include: { item: true },
  });

  const state = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      flameProtectedUntil: true, flameLostAt: true, streakBeforeReset: true,
      activeTitleId: true, activeFrameId: true, activeThemeId: true,
    },
  });

  return (
    // 🖥️📱 Plein écran : recouvre la coquille classique
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain elite-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <MonetiseNav passActive={true} />
        <BoutiqueClient
          items={items.map(i => ({ id: i.id, name: i.name, category: i.category, priceUA: i.priceUA, icon: i.icon, description: i.description, effectKey: i.effectKey }))}
          inventory={inventory.map(inv => ({
            itemId: inv.itemId, name: inv.item.name, icon: inv.item.icon,
            quantity: inv.quantity, category: inv.item.category, effectKey: inv.item.effectKey,
          }))}
          uaBalance={user.uaBalance}
          flameProtectedUntil={state?.flameProtectedUntil?.toISOString() ?? null}
          flameLostAt={state?.flameLostAt?.toISOString() ?? null}
          lostStreak={state?.streakBeforeReset ?? 0}
          equipped={{ title: state?.activeTitleId ?? null, frame: state?.activeFrameId ?? null, theme: state?.activeThemeId ?? null }}
        />
      </div>
    </div>
  );
}