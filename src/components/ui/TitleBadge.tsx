import { RARITY_STYLES, type Rarity } from '@/lib/personnalisation-data';

type TitleLike = { icon: string; name: string; rarity: Rarity };

const FX_CLASS: Record<Rarity, string> = {
  COMMUN: '',
  RARE: 'fx-title--rare',
  EPIC: 'fx-title--epic',
  LEGENDAIRE: 'fx-title--legend',
  EXCLUSIF: 'fx-title--excl',
};

// Titre équipé : l'effet dépend de la rareté (reflet, dégradé qui coule, or liquide, arc-en-ciel).
export default function TitleBadge({ title, size = 'md', className = '' }: { title: TitleLike; size?: 'sm' | 'md'; className?: string }) {
  const sizing = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-4 py-1.5 text-sm';
  const base = title.rarity === 'COMMUN' || title.rarity === 'RARE' ? RARITY_STYLES[title.rarity].cls : '';
  const sparkle = title.rarity === 'LEGENDAIRE' || title.rarity === 'EXCLUSIF';
  return (
    <span className={`fx-title ${FX_CLASS[title.rarity]} ${sizing} ${base} ${className}`}>
      <span className="fx-title-text">{title.icon} {title.name}</span>
      {sparkle && <span className="fx-spark" aria-hidden="true">✦</span>}
    </span>
  );
}
