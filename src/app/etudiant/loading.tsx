import EcgLine from '@/components/ui/EcgLine';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <EcgLine className="h-12 w-56" />
      <p className="mt-4 font-display text-xs font-bold uppercase tracking-widest text-mute">Consultation en cours…</p>
    </div>
  );
}
