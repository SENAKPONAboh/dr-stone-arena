import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'flame' | 'heart' | 'star' | 'trophy' | 'swords' | 'user' | 'home' | 'shield'
  | 'chest' | 'stethoscope' | 'ecg' | 'brain' | 'cell' | 'check' | 'close' | 'lock'
  | 'chat' | 'bell' | 'gem' | 'crown';

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// Jeu d'icônes maison, grille 24x24, couleur = currentColor.
const PATHS: Record<IconName, ReactNode> = {
  flame: <path d="M12 2c.6 3.2-1.2 4.9-2.8 6.6C7.5 10.4 6 12.2 6 15a6 6 0 0 0 12 0c0-2.4-1-4.2-2.2-5.6-.3 1.1-.9 1.9-1.8 2.3.5-3.4-.3-7.4-2-9.7Z" fill="currentColor" />,
  heart: <path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7.2a4.8 4.8 0 0 1 8.5 2.6C20.5 15.8 12 21 12 21Z" fill="currentColor" />,
  star: <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" fill="currentColor" />,
  trophy: <path d="M7 3h10v5a5 5 0 0 1-10 0V3ZM4 4h3v2.5A2.5 2.5 0 0 1 4 4Zm16 0h-3v2.5A2.5 2.5 0 0 0 20 4ZM11 13h2v3h3v2.5H8V16h3v-3Zm-3 6h8v2H8v-2Z" fill="currentColor" />,
  swords: <path d="M4 4l9 9M20 4l-9 9M7 14l-3 3 3 3 3-3M17 14l3 3-3 3-3-3" {...stroke} />,
  user: <g fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0H4Z" /></g>,
  home: <path d="M12 3 2.5 11.5H5V21h5v-6h4v6h5v-9.5h2.5L12 3Z" fill="currentColor" />,
  shield: <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.2 7.5 10 4.4-1.8 7.5-5.4 7.5-10v-6L12 2.5Z" fill="currentColor" />,
  chest: <g fill="currentColor"><path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1H3v-1Z" /><path d="M3 12.5h7v1.5h4v-1.5h7V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.5Z" /></g>,
  stethoscope: <g {...stroke}><path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v2a4 4 0 0 0 8 0v-1" /><circle cx="18" cy="12" r="2" /></g>,
  ecg: <path d="M2 12h5l2-6 4 12 2.5-6H22" {...stroke} />,
  brain: <path d="M12 5v14M12 5a3 3 0 0 0-5.5 1.5A3.5 3.5 0 0 0 5 12.5 3.5 3.5 0 0 0 7.5 18 3 3 0 0 0 12 19M12 5a3 3 0 0 1 5.5 1.5A3.5 3.5 0 0 1 19 12.5a3.5 3.5 0 0 1-2.5 5.5A3 3 0 0 1 12 19" {...stroke} />,
  cell: <g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" fill="currentColor" /></g>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" {...stroke} strokeWidth={3} />,
  close: <path d="M6 6l12 12M18 6 6 18" {...stroke} strokeWidth={3} />,
  lock: <g><rect x="5" y="10" width="14" height="11" rx="2.5" fill="currentColor" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" {...stroke} strokeWidth={2.2} /></g>,
  chat: <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="currentColor" />,
  bell: <path d="M12 2.5a6 6 0 0 0-6 6v4L4 16h16l-2-3.5v-4a6 6 0 0 0-6-6ZM9.5 18.5a2.5 2.5 0 0 0 5 0h-5Z" fill="currentColor" />,
  gem: <path d="M6 3h12l4 6-10 12L2 9l4-6Zm1 6 5 9 5-9H7Z" fill="currentColor" fillRule="evenodd" />,
  crown: <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" fill="currentColor" />,
};

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: IconName; size?: number };

export default function Icon({ name, size = 24, ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
