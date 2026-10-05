import EcgLine from '@/components/ui/EcgLine';

// Animation de chargement (entre deux pages) : le logo respire au centre de deux anneaux bleu / or qui tournent.
export default function LogoLoader({ label = 'Consultation en cours' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="logo-loader">
        <span className="ll-halo" />
        <span className="ll-ring" />
        <span className="ll-ring-2" />
        <div className="ll-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/mark.png" alt="" draggable={false} />
        </div>
        <span className="ll-sheen" />
      </div>
      <EcgLine className="mt-6 h-10 w-52 opacity-80" />
      <p className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-mute">
        {label}<span className="logo-loader-dots ml-2 align-middle"><span /><span /><span /></span>
      </p>
    </div>
  );
}
