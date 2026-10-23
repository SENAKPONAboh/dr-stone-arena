import Link from 'next/link';
import type { ReactNode } from 'react';
import AdminIcon, { type AdminIconName } from './AdminIcon';

// Classes écrites en entier : Tailwind ne génère pas les noms construits à la volée.
export type Tone = 'ink' | 'mala' | 'gold' | 'heart' | 'sky' | 'flame' | 'mute';
export const TONE_TEXT: Record<Tone, string> = {
  ink: 'text-ink', mala: 'text-mala', gold: 'text-gold', heart: 'text-heart', sky: 'text-sky', flame: 'text-flame', mute: 'text-mute',
};
export const TONE_CHIP: Record<Tone, string> = {
  ink: 'text-ink bg-slab-2', mala: 'text-mala bg-mala/15', gold: 'text-gold bg-gold/15', heart: 'text-heart bg-heart/15',
  sky: 'text-sky bg-sky/15', flame: 'text-flame bg-flame/15', mute: 'text-mute bg-slab-2',
};

// En-tête commun à toutes les pages du panel : retour, icône, titre, sous-titre, action à droite.
export default function AdminHeader({ title, subtitle, icon, back = '/admin', tone = 'mala', right }: {
  title: string;
  subtitle?: string;
  icon: AdminIconName;
  back?: string | null;
  tone?: Tone;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-stone/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {back && (
          <Link href={back} aria-label="Retour" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-slab text-mute transition-colors hover:text-ink">
            <AdminIcon name="back" />
          </Link>
        )}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${TONE_CHIP[tone]}`}>
          <AdminIcon name={icon} size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="adm-title truncate text-base sm:text-lg">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold text-mute">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

// Carte de chiffre clé.
export function Stat({ label, value, sub, tone = 'ink', className = '' }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; className?: string;
}) {
  return (
    <div className={`adm-card p-4 ${className}`}>
      <p className="adm-label">{label}</p>
      <p className={`adm-num mt-1 text-xl ${TONE_TEXT[tone]} sm:text-2xl`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </div>
  );
}

// Titre de section.
export function SectionTitle({ children, icon }: { children: ReactNode; icon?: AdminIconName }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-mute">
      {icon && <AdminIcon name={icon} size={16} />} {children}
    </h2>
  );
}
