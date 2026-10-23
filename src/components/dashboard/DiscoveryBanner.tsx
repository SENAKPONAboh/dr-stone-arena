import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { DISCOVERY_DAYS, DISCOVERY_DAILY_DUELS } from '@/lib/decouverte';

// Bandeau des 7 jours de Découverte (accueil). Affiché seulement pendant la Découverte.
export default function DiscoveryBanner({ daysLeft }: { daysLeft: number }) {
  const lastDay = daysLeft <= 1;
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-sky/40 bg-slab p-5">
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/5 animate-shimmer" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky/15 text-sky"><Icon name="chest" size={24} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold text-sky">
            Découverte offerte · {lastDay ? 'dernier jour !' : `encore ${daysLeft} jours`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Pendant tes {DISCOVERY_DAYS} premiers jours, tout le Premium est ouvert : <b className="text-ink">1 vie toutes les 2 h</b> et <b className="text-ink">{DISCOVERY_DAILY_DUELS} duels par jour</b>. Profites-en pour tout tester ! (L&apos;Espace Élite reste à part.)
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {Array.from({ length: DISCOVERY_DAYS }).map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < DISCOVERY_DAYS - daysLeft ? 'bg-slab-2' : 'bg-sky'}`} />
            ))}
          </div>
          {lastDay && (
            <Link href="/etudiant/premium" className="mt-3 inline-block text-xs font-bold text-gold">Garder ces avantages avec le Premium →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
