import EcgLine from '@/components/ui/EcgLine';
import Logo from '@/components/ui/Logo';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Logo size={72} />
      <EcgLine className="mt-4 h-12 w-56" />
      <p className="mt-4 font-display text-xs font-bold uppercase tracking-widest text-mute">Consultation en cours…</p>
    </div>
  );
}
