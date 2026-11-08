import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getOrCreatePersonalisationCatalog } from '@/lib/personnalisation';
import { getOrCreateShopCatalog } from '@/lib/monetise-shop';
import { monthKey, PREMIUM_MONTHLY_UA, UA_CHEST_BY_TIER, UA_STAR_CHEST, UA_DUEL_WIN, UA_DUEL_LOSS } from '@/lib/league-profile';
import BoutiqueLigue from '@/components/league/BoutiqueLigue';
import { demoAllowed } from '@/lib/league';

// ===== BOUTIQUE (ouverte à tous) : on paie avec les UA gagnées en ligue, en duel et avec le coffre Premium =====
export default async function BoutiquePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ETUDIANT') redirect('/login');

  // Catalogue lu directement (déjà enregistré) ; on ne le recrée que s'il est vide (première fois) — sinon la page mettait ~60 s
  const CATS = ['CADRE', 'TITRE', 'THEME', 'FLAMME'];
  let catalog = await prisma.shopItem.findMany({ where: { category: { in: CATS }, isActive: true }, orderBy: [{ category: 'asc' }, { priceUA: 'asc' }] });
  if (catalog.length === 0) {
    const [p, sh] = await Promise.all([getOrCreatePersonalisationCatalog().catch(() => []), getOrCreateShopCatalog().catch(() => [])]);
    catalog = [...p, ...sh.filter((i) => i.category === 'FLAMME')];
  }
  const [inventory, equipped, profile] = await Promise.all([
    prisma.userInventory.findMany({ where: { userId: user.id }, select: { itemId: true, quantity: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { activeFrameId: true, activeTitleId: true, activeThemeId: true } }),
    prisma.leagueProfile.findUnique({ where: { userId: user.id } }).catch(() => null),
  ]);
  const items = catalog.map((i) => ({
    id: i.id, name: i.name, category: i.category, priceUA: i.priceUA, icon: i.icon, effectKey: i.effectKey, description: i.description,
  }));
  const demo = demoAllowed((await searchParams).demo); // local uniquement : solde fictif pour le tutoriel
  const premiumAmount = user.isPremium && user.premiumTier ? PREMIUM_MONTHLY_UA[user.premiumTier] ?? 0 : 0;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-stone pb-12 font-body text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-stone">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link href="/etudiant" className="text-mute transition-colors hover:text-ink" aria-label="Retour">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-display text-lg font-extrabold text-ink">Boutique</h1>
        </div>
      </header>
      <main className="mx-auto mt-5 max-w-3xl px-4">
        <BoutiqueLigue
          initialUa={demo ? 12400 : profile?.ua ?? 0}
          items={items}
          owned={Object.fromEntries(inventory.map((i) => [i.itemId, i.quantity]))}
          equipped={{ CADRE: equipped?.activeFrameId ?? null, TITRE: equipped?.activeTitleId ?? null, THEME: equipped?.activeThemeId ?? null }}
          premium={{ amount: premiumAmount, claimed: profile?.premiumUaMonth === monthKey() }}
          earn={{ chestByTier: UA_CHEST_BY_TIER, star: UA_STAR_CHEST, duelWin: UA_DUEL_WIN, duelLoss: UA_DUEL_LOSS, premium: PREMIUM_MONTHLY_UA }}
          user={{ imageUrl: user.imageUrl, initials: `${user.prenom.charAt(0)}${user.nom.charAt(0)}` }}
        />
      </main>
    </div>
  );
}
