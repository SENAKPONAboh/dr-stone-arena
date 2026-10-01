import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getNiveauLabel } from '@/lib/niveau';
import { getCountryFlag } from '@/lib/country-flags';
import { getTitleDef } from '@/lib/personnalisation-data';
import GoldAvatar from '@/components/ui/GoldAvatar';
import Icon from '@/components/ui/Icon';

export default async function FullLeaderboardPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ETUDIANT') redirect('/login');

  const { scope } = await searchParams;
  const isGlobal = !scope || scope === 'global';
  const isLevel = scope === 'niveau';
  const isCountry = scope === 'pays';

  const where = {
    role: 'ETUDIANT',
    statut: 'VALIDE',
    ...(isLevel ? { anneeEtude: user.anneeEtude } : {}),
    ...(isCountry ? { pays: user.pays } : {}),
  };

  const allUsers = await prisma.user.findMany({
    where,
    orderBy: { xp: 'desc' },
    select: { id: true, prenom: true, nom: true, xp: true, pseudo: true, imageUrl: true, isPremium: true, passActive: true, anneeEtude: true, pays: true, universite: true, activeFrameId: true, activeTitleId: true }
  });

  const tabStyle = (active: boolean) => `rounded-2xl px-2 py-2.5 text-center font-display text-[11px] font-bold uppercase tracking-wide transition-all ${active
    ? 'bg-mala text-stone shadow-[0_3px_0_#0f7a4f]'
    : 'bg-slab-2 text-mute'}`;

  return (
    // 🖥️📱 PLEIN ÉCRAN : recouvre la coquille classique — la flèche retour sert de sortie
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-stone pb-10 font-body text-ink">

      <header className="border-b border-line bg-stone">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link href="/etudiant" className="text-mute transition-colors hover:text-ink" aria-label="Retour">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink"><Icon name="trophy" size={22} className="text-gold" /> Classement</h1>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-3xl px-4">
        <div className="rounded-3xl border border-line bg-slab p-5">

          {/* ===== Onglets : Global | Niveau | Pays ===== */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Link href="/etudiant/leaderboard" className={tabStyle(isGlobal)}>🌍 Global</Link>
            <Link href="/etudiant/leaderboard?scope=niveau" className={tabStyle(isLevel)}>🎓 Mon niveau</Link>
            <Link href="/etudiant/leaderboard?scope=pays" className={tabStyle(isCountry)}>{getCountryFlag(user.pays)} Mon pays</Link>
          </div>

          {/* Filtre actif */}
          <p className="mb-4 text-center text-xs text-mute">
            {isGlobal && 'Tous les étudiants, tous pays, tous niveaux'}
            {isLevel && (user.anneeEtude ? `Étudiants de ton niveau : ${getNiveauLabel(user.anneeEtude)}` : '')}
            {isCountry && (user.pays ? `Étudiants de : ${getCountryFlag(user.pays)} ${user.pays}` : '')}
          </p>

          {/* Cas : niveau non défini */}
          {isLevel && !user.anneeEtude && (
            <div className="mb-4 rounded-2xl border-2 border-gold/30 bg-gold/10 p-6 text-center">
              <div className="mb-2 text-4xl">🎓</div>
              <p className="font-bold text-gold">Niveau non défini</p>
              <p className="mt-1 text-sm text-mute">Ton compte n'a pas de niveau associé, le classement par niveau n'est pas disponible.</p>
            </div>
          )}

          {/* Cas : pays non renseigné */}
          {isCountry && !user.pays && (
            <div className="mb-4 rounded-2xl border-2 border-gold/30 bg-gold/10 p-6 text-center">
              <div className="mb-2 text-4xl">🚩</div>
              <p className="font-bold text-gold">Pays non renseigné</p>
              <p className="mt-1 text-sm text-mute">Ton compte n'a pas de pays associé, le classement par pays n'est pas disponible.</p>
            </div>
          )}

          {allUsers.length === 0 ? (
            <p className="py-8 text-center text-mute">
              Aucun étudiant {isGlobal ? 'inscrit' : isLevel ? 'dans ton niveau' : user.pays ? `en ${user.pays}` : 'à afficher'} pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((u, index) => {
                const title = getTitleDef(u.activeTitleId);
                return (
                  <div key={u.id} className={`flex items-center gap-3 rounded-2xl p-3 ${u.id === user.id ? 'border-2 border-mala/50 bg-mala/10' : 'border border-line bg-slab-2'}`}>

                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold ${
                      index === 0 ? 'bg-gold text-stone' :
                      index === 1 ? 'bg-mute text-stone' :
                      index === 2 ? 'bg-flame text-stone' :
                      'bg-slab text-mute'
                    }`}>
                      {index + 1}
                    </div>

                    <Link href={`/etudiant/profil/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80">
                      <GoldAvatar
                        imageUrl={u.imageUrl}
                        initials={`${u.prenom.charAt(0)}${u.nom.charAt(0)}`}
                        passActive={u.passActive}
                        frameKey={u.activeFrameId}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-bold text-ink">
                          {u.pseudo || `${u.prenom} ${u.nom}`}
                          {u.isPremium && <span title="Premium">👑</span>}
                        </p>
                        {title && <p className="truncate text-[11px] font-bold text-gold">{title.icon} {title.name}</p>}
                        <p className="truncate text-xs text-mute">
                          {getNiveauLabel(u.anneeEtude)}{u.pays ? ` · ${getCountryFlag(u.pays)} ${u.pays}` : ''}{u.universite ? ` · 🏫 ${u.universite}` : ''}
                        </p>
                      </div>
                    </Link>

                    <div className="flex-shrink-0 text-right">
                      <p className="flex items-center justify-end gap-1 font-display text-sm font-extrabold tabular-nums text-mala"><Icon name="star" size={14} /> {u.xp}</p>
                      <p className="text-xs text-mute">XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
