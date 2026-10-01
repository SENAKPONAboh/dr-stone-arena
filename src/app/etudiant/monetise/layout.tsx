import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import MonetiseNav from '@/components/monetise/MonetiseNav';
import GoldSweep from '@/components/monetise/GoldSweep';
import '@/styles/monetise.css';

export default async function MonetiseLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');
  if (user.role === 'ADMIN') redirect('/admin');
  if (user.role === 'CORRECTEUR') redirect('/correcteur');

  // Purge d'expiration du Pass (même pattern que le Premium au dashboard)
  if (user.passActive && user.passExpiresAt && new Date(user.passExpiresAt) < new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passActive: false, passExpiresAt: null }
    });
    user.passActive = false;
    user.passExpiresAt = null;
  }

  return (
    <div className="min-h-screen elite-bg pb-24 md:pb-10">
      <GoldSweep />
      {/* Header — gradient or animé */}
      <header className="sticky top-0 z-40 bg-[#1a1308]/95 backdrop-blur border-b-2 border-yellow-600/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <Link href="/etudiant" className="text-yellow-600/70 hover:text-yellow-500 text-xs font-bold bg-white/5 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
            ← Classique
          </Link>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-yellow-400/10 border border-yellow-500/30 px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold text-yellow-400 flex items-center gap-1 whitespace-nowrap">
              🪙 {user.uaBalance.toLocaleString("fr-FR")} UA
            </span>
            <span className="bg-orange-400/10 border border-orange-500/30 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold text-orange-400 flex items-center gap-1 whitespace-nowrap">
              <span className={user.streak >= 15 ? "animate-flame-intense inline-block" : "animate-flame inline-block"}>🔥</span> {user.streak}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        <MonetiseNav passActive={user.passActive} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}