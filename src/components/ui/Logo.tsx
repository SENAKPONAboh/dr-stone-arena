// Logo « DS » : monogramme argent et bleu, avec un halo bleu qui pulse lentement.
export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <div className="logo-tile relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="absolute inset-[8%] rounded-full blur-xl animate-logo-pulse" style={{ background: 'rgba(47,123,255,0.45)' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/mark.png" alt="Dr. Stone Arena" width={size} height={size} className="relative h-full w-full object-contain" draggable={false} />
    </div>
  );
}
