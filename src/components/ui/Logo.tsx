import Icon from './Icon';

// Logo : cerveau + stéthoscope stylisés, halo malachite qui pulse lentement.
export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-mala/30 blur-xl animate-logo-pulse" />
      <span className="relative flex h-full w-full items-center justify-center rounded-2xl border border-line bg-slab text-mala">
        <Icon name="brain" size={size * 0.55} />
        <span className="absolute -bottom-1 -right-1 flex h-[40%] w-[40%] items-center justify-center rounded-full bg-mala text-stone">
          <Icon name="stethoscope" size={size * 0.24} />
        </span>
      </span>
    </div>
  );
}
