// Tracé ECG malachite qui défile en boucle (transform uniquement).
// Le motif est dessiné deux fois côte à côte : le défilement de -50 % boucle sans coupure.
const BEAT = 'M0 20h40l6-14 8 30 7-24 5 8h34';

export default function EcgLine({ className = '', color = '#2fd28a' }: { className?: string; color?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 800 40" preserveAspectRatio="none" className="h-full w-[200%] animate-ecg-scroll">
        <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {[0, 100, 200, 300, 400, 500, 600, 700].map((x) => (
            <path key={x} d={BEAT} transform={`translate(${x} 0)`} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>
    </div>
  );
}
