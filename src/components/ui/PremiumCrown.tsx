import Icon from './Icon';

// 👑 Couronne Premium dessinée (l'emoji s'affiche mal sur certains téléphones et sous Windows 10)
export default function PremiumCrown({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span title="Premium" aria-label="Premium" className={`inline-flex flex-shrink-0 text-gold drop-shadow-[0_0_4px_rgba(242,193,78,0.6)] ${className}`}>
      <Icon name="crown" size={size} />
    </span>
  );
}
