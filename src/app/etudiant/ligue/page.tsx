import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLeagueView, getLeaguesOverview, demoAllowed, demoLeagueView, demoOverview, LEAGUES, DUEL_WIN, DUEL_WIN_HIGHER, DUEL_LOSS, DUELS_FULL_POINTS } from '@/lib/league';
import LeagueCountdown from '@/components/league/LeagueCountdown';
import ChestOpener from '@/components/league/ChestOpener';
import { getNiveauLabel } from '@/lib/niveau';
import BackLink from '@/components/ui/BackLink';

// ===== MA LIGUE DE LA SEMAINE =====
export default async function LeaguePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ETUDIANT') redirect('/login');

  const demo = demoAllowed((await searchParams).demo); // local uniquement : données fictives pour le tutoriel
  const [view, overview] = demo ? [demoLeagueView(), demoOverview()] : await Promise.all([getLeagueView(user.id), getLeaguesOverview()]);
  const L = view.status === 'unavailable' || view.status === 'soon' ? LEAGUES[0] : LEAGUES[view.tier];
  const stars = view.status === 'waiting' || view.status === 'active' ? view.stars : 0;

  return (
    // Plein écran (même convention que le classement) : la flèche retour sert de sortie
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-stone pb-12 font-body text-ink">
      <header className="border-b border-line bg-stone">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <BackLink fallback="/etudiant" className="text-mute transition-colors hover:text-ink" aria-label="Retour">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </BackLink>
          <h1 className="font-display text-lg font-extrabold text-ink">Ma ligue</h1>
        </div>
      </header>

      <main className="mx-auto mt-5 max-w-3xl space-y-4 px-4">
        {view.status === 'unavailable' || view.status === 'soon' ? (
          <div className="rounded-3xl border border-line bg-slab p-6 text-center">
            <p className="font-display text-lg font-extrabold">Les ligues arrivent bientôt</p>
            <p className="mt-2 text-sm text-mute">{view.status === 'soon' ? 'Départ lundi 9 novembre à minuit : tout le monde part de 0 point.' : 'Encore un peu de patience !'}</p>
          </div>
        ) : (
          <>
            {/* En-tête : insigne, ligue, étoiles, compte à rebours */}
            <div className="relative overflow-hidden rounded-3xl border bg-slab p-5 text-center" style={{ borderColor: `${L.color}66` }}>
              <span aria-hidden className="pointer-events-none absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl" style={{ background: `${L.color}40` }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/ligues/ligue-${view.tier}.png`} alt={`Ligue ${L.name}`} className="relative mx-auto h-40 w-[216px] animate-float object-contain" />
              <p className="relative mt-1 font-display text-2xl font-extrabold" style={{ color: L.color }}>Ligue {L.name}</p>
              {stars > 0 && <p className="relative font-display text-lg text-gold">{'★'.repeat(Math.min(stars, 10))}</p>}
              <p className="relative mt-1 text-xs font-bold text-mute">Fin de la semaine dans <LeagueCountdown endsAt={view.endsAt} className="text-ink" /></p>
              <div className="relative mt-3 flex flex-wrap justify-center gap-1.5">
                {LEAGUES.map((l, i) => (
                  <span key={l.name} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${i === view.tier ? 'bg-ink text-stone' : i < view.openTiers ? 'bg-slab-2 text-mute' : 'bg-slab-2 text-mute/50'}`}>
                    {l.name}{i >= view.openTiers ? ' 🔒' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Résultat de la semaine dernière + coffre à ouvrir */}
            {view.lastResult && (
              <div className="rounded-3xl border border-line bg-slab p-4 text-center text-sm font-bold">
                {view.lastResult === 'MONTE' ? '🎉 La semaine dernière, tu es monté de ligue !' : view.lastResult === 'ETOILE' ? '⭐ La semaine dernière, tu as gagné une étoile !'
                  : view.lastResult === 'DESCEND' ? 'La semaine dernière, tu es redescendu. Reprends ta place cette semaine !' : 'La semaine dernière, tu as gardé ta ligue.'}
              </div>
            )}
            {view.chestUa > 0 && <ChestOpener amount={view.chestUa} label={view.chestLabel} />}

            <Link href="/etudiant/boutique" className="flex items-center gap-3 rounded-3xl border border-gold/40 bg-slab p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#fff3c9] via-gold to-[#9a6a12] font-display text-xs font-extrabold text-[#5a3d06]">UA</span>
              <span className="flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-mute">Mes UA</span>
                <span className="block font-display text-lg font-extrabold text-gold">{view.ua.toLocaleString('fr-FR')}</span>
              </span>
              <span className="font-display text-xs font-bold uppercase text-gold">Boutique →</span>
            </Link>

            {view.status === 'waiting' ? (
              <div className="rounded-3xl border border-line bg-slab p-5 text-center">
                <p className="font-display text-base font-extrabold">Ton groupe t&apos;attend</p>
                <p className="mt-1 text-sm text-mute">Les points de ligue viennent de ta <b className="text-ink">garde du jour</b> (tes 10 cas) et de tes <b className="text-ink">duels</b>. Ton premier point de la semaine te fait entrer dans un groupe d&apos;environ 15 étudiants de ta ligue, et tout le monde part de 0.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href="/etudiant/challenge" className="block rounded-2xl bg-mala px-3 py-3.5 font-display text-xs font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
                    Garde du jour
                  </Link>
                  <Link href="/etudiant/arene" className="block rounded-2xl bg-slab-2 px-3 py-3.5 font-display text-xs font-bold uppercase tracking-wide text-ink">
                    Lancer un duel
                  </Link>
                </div>
                <p className="mt-2 text-[11px] text-mute">Garde déjà finie aujourd&apos;hui ? Un duel suffit pour entrer, ou reviens demain.</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-line bg-slab p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="font-display text-sm font-bold">Ton groupe · {view.rows.length} joueur{view.rows.length > 1 ? 's' : ''}</h2>
                  <span className="text-xs font-bold text-mute">Points de la semaine</span>
                </div>
                <ol className="space-y-1.5">
                  {view.rows.map((r) => {
                    const n = view.rows.length;
                    const star = r.rank <= view.starZone, up = r.rank <= view.up, down = view.down > 0 && r.rank > n - view.down;
                    const zone = star ? 'border-gold/40 bg-gold/10' : up ? 'border-mala/40 bg-mala/10' : down ? 'border-heart/40 bg-heart/10' : 'border-line bg-slab-2';
                    return (
                      <li key={r.userId}>
                      <Link href={r.me ? '/etudiant/profil' : `/etudiant/profil/${r.userId}`} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-transform active:scale-[0.98] ${zone} ${r.me ? 'ring-2 ring-sky' : ''}`}>
                        <span className={`w-7 text-center font-display text-sm font-extrabold ${star ? 'text-gold' : up ? 'text-mala' : down ? 'text-heart' : 'text-mute'}`}>{r.rank}</span>
                        {r.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={r.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                          : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slab font-display text-sm font-bold">{r.name.charAt(0).toUpperCase()}</span>}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{r.me ? `${r.name} (toi)` : r.name}</span>
                          <span className="block text-[10px] text-mute">{getNiveauLabel(r.anneeEtude)}</span>
                        </span>
                        <span className="font-display text-sm font-extrabold tabular-nums">{r.points}</span>
                        <span className="w-4 text-center text-xs">{star ? <span className="text-gold">★</span> : up ? <span className="text-mala">▲</span> : down ? <span className="text-heart">▼</span> : ''}</span>
                      </Link>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3 px-1 text-[11px] text-mute">Touche un joueur pour voir son profil et le <b className="text-ink">défier en duel</b> (étudiants de ta promotion).</p>
                <div className="mt-2 flex flex-wrap gap-3 px-1 text-[10px] font-bold text-mute">
                  {view.starZone > 0 && <span><span className="text-gold">★</span> gagnent une étoile</span>}
                  {view.up > 0 && <span><span className="text-mala">▲</span> montent en {LEAGUES[view.tier + 1]?.name}</span>}
                  {view.down > 0 && <span><span className="text-heart">▼</span> redescendent en {LEAGUES[view.tier - 1]?.name}</span>}
                </div>
              </div>
            )}

            {/* Toutes les ligues ouvertes : nombre de joueurs et les 5 meilleurs de la semaine */}
            {overview.length > 0 && (
              <div className="rounded-3xl border border-line bg-slab p-4">
                <h2 className="mb-3 px-1 font-display text-sm font-bold">Toutes les ligues cette semaine</h2>
                <div className="space-y-3">
                  {[...overview].reverse().map((o) => {
                    const LL = LEAGUES[o.tier];
                    const mine = view.tier === o.tier;
                    return (
                      <div key={o.tier} className={`rounded-2xl border p-3 ${mine ? 'ring-2 ring-sky' : ''}`} style={{ borderColor: `${LL.color}55` }}>
                        <div className="mb-2 flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/ligues/ligue-${o.tier}.png`} alt="" className="h-8 w-11 object-contain" />
                          <span className="flex-1 font-display text-sm font-extrabold" style={{ color: LL.color }}>Ligue {LL.name}{mine ? ' · ta ligue' : ''}</span>
                          <span className="text-[11px] font-bold text-mute">{o.players} joueur{o.players > 1 ? 's' : ''}</span>
                        </div>
                        {o.top.length === 0 ? <p className="px-1 text-xs text-mute">Personne n&apos;a encore joué cette semaine.</p> : (
                          <ol className="space-y-1">
                            {o.top.map((t, i) => (
                              <li key={t.userId}>
                                <Link href={t.userId === user.id ? '/etudiant/profil' : `/etudiant/profil/${t.userId}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slab-2">
                                  <span className="w-5 text-center font-display text-xs font-bold text-mute">{i + 1}</span>
                                  <span className="min-w-0 flex-1 truncate font-bold">{t.userId === user.id ? `${t.name} (toi)` : t.name}</span>
                                  <span className="text-[10px] text-mute">{getNiveauLabel(t.anneeEtude)}</span>
                                  <span className="w-12 text-right font-display text-xs font-extrabold tabular-nums">{t.points}</span>
                                </Link>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Règles en bref */}
            <div className="rounded-3xl border border-line bg-slab p-5">
              <h2 className="font-display text-sm font-bold">Comment gagner des points de ligue</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-3"><span>Cas du jour réussi</span><b className="text-mala">+ l&apos;XP gagnée</b></li>
                <li className="flex justify-between gap-3"><span>Cas raté</span><b className="text-heart">− l&apos;XP perdue</b></li>
                <li className="flex justify-between gap-3"><span>Duel gagné</span><b className="text-mala">+{DUEL_WIN}</b></li>
                <li className="flex justify-between gap-3"><span>Duel gagné contre une ligue au-dessus</span><b className="text-gold">+{DUEL_WIN_HIGHER}</b></li>
                <li className="flex justify-between gap-3"><span>Duel perdu</span><b>+{DUEL_LOSS}</b></li>
              </ul>
              <p className="mt-3 text-xs text-mute">
                Les points de ligue sont à part de ton XP et repartent à 0 chaque lundi. 1 duel compté par adversaire et par semaine ; au-delà de {DUELS_FULL_POINTS} duels dans la journée, les points sont divisés par 2.
                Dimanche à minuit, environ 1 joueur sur 5 monte (avec un coffre d&apos;UA) et 1 sur 5 redescend. Dans la plus haute ligue ouverte, les 3 premiers gagnent une étoile (et un coffre). Quand une ligue a assez de joueurs, la suivante s&apos;ouvre : ceux qui ont le plus d&apos;étoiles y entrent en premier.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
