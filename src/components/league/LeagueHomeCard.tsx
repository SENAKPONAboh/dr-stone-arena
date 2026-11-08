import Link from 'next/link';
import { LEAGUES, type LeagueView } from '@/lib/league';
import LeagueCountdown from './LeagueCountdown';

// Carte « Ma ligue » en haut de l'accueil.
export default function LeagueHomeCard({ view }: { view: LeagueView }) {
  if (view.status === 'unavailable') return null;
  if (view.status === 'soon') {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-gold/40 bg-slab p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ligues/ligue-2.png" alt="" className="h-14 w-[76px] shrink-0 animate-float object-contain" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-extrabold text-gold">Les ligues de la semaine arrivent</span>
          <span className="block text-xs text-mute">Départ lundi 9 novembre à minuit : tout le monde part de 0 point.</span>
        </span>
      </div>
    );
  }
  const L = LEAGUES[view.tier];
  const stars = view.stars > 0 ? ` ${'★'.repeat(Math.min(view.stars, 5))}${view.stars > 5 ? `×${view.stars}` : ''}` : '';

  let line: React.ReactNode;
  if (view.status === 'waiting') {
    line = <>Ta garde du jour et tes duels te font entrer dans ton groupe.</>;
  } else {
    const n = view.rows.length, r = view.myRank;
    const inUp = r <= view.up, inStar = r <= view.starZone, inDown = view.down > 0 && r > n - view.down;
    line = inStar ? <><b className="text-gold">Zone étoile</b> : tiens bon jusqu&apos;à dimanche !</>
      : inUp ? <><b className="text-mala">Zone de montée</b> : tiens bon jusqu&apos;à dimanche !</>
      : inDown ? <><b className="text-heart">Zone de descente</b> : rejoue pour remonter !</>
      : view.up > 0 ? <>{r - view.up} place{r - view.up > 1 ? 's' : ''} de la zone de montée</>
      : view.starZone > 0 ? <>{r - view.starZone} place{r - view.starZone > 1 ? 's' : ''} de la zone étoile</> : <>Continue à jouer !</>;
  }

  return (
    <div className="space-y-3">
    <Link href="/etudiant/ligue" className="relative flex items-center gap-3 overflow-hidden rounded-3xl border bg-slab p-4 transition-transform active:scale-[0.98]"
      style={{ borderColor: `${L.color}66` }}>
      <span aria-hidden className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `${L.color}33` }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/ligues/ligue-${view.tier}.png`} alt={`Ligue ${L.name}`} className="relative h-16 w-[86px] shrink-0 animate-float object-contain" />
      <span className="relative min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-mute">Ma ligue de la semaine</span>
        <span className="block font-display text-base font-extrabold" style={{ color: L.color }}>
          Ligue {L.name}<span className="text-gold">{stars}</span>
          {view.status === 'active' && <span className="ml-2 text-ink">{view.myRank}ᵉ<span className="text-xs text-mute"> / {view.rows.length}</span></span>}
        </span>
        <span className="block text-xs text-mute">{line}</span>
        <span className="mt-0.5 block text-[10px] font-bold text-mute">Fin dans <LeagueCountdown endsAt={view.endsAt} /></span>
      </span>
      <span className="relative font-display text-lg font-extrabold" style={{ color: L.color }}>→</span>
    </Link>
    <Link href={view.chestUa > 0 ? '/etudiant/ligue' : '/etudiant/boutique'} className="flex items-center gap-3 rounded-3xl border border-gold/40 bg-slab p-4 transition-transform active:scale-[0.98]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fff3c9] via-gold to-[#9a6a12] font-display text-xs font-extrabold text-[#5a3d06]">UA</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-extrabold text-gold">{view.chestUa > 0 ? '🎁 Un coffre t’attend !' : 'Boutique'}</span>
        <span className="block text-xs text-mute">{view.ua.toLocaleString('fr-FR')} UA · cadres, titres, thèmes, protections de Flamme</span>
      </span>
      <span className="font-display text-lg font-extrabold text-gold">→</span>
    </Link>
    </div>
  );
}
