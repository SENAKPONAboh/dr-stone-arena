// Petite marque à côté du nom d'un joueur qui a terminé au moins un mois au grade maximum : « ⚡ ×2 ».
// N'affiche rien pour les autres.
export default function LegendMark({ count, className = '' }: { count?: number; className?: string }) {
  if (!count || count < 1) return null;
  return (
    <span
      title={`Légende Immortelle atteinte ${count} fois en fin de saison`}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-display text-[10px] font-black text-white ${className}`}
      style={{ background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)', animation: 'fxStorm 3s linear infinite' }}
    >
      ⚡×{count}
    </span>
  );
}
