import type { ReactNode, SVGProps } from 'react';

// Icônes du panel admin (grille 24x24, trait = currentColor). Les emojis s'affichent mal sous Windows 10.
export type AdminIconName =
  | 'back' | 'logout' | 'users' | 'crown' | 'gem' | 'coins' | 'bank' | 'receipt' | 'upload' | 'book'
  | 'layers' | 'card' | 'trophy' | 'flag' | 'search' | 'alert' | 'chart' | 'megaphone' | 'file' | 'plus'
  | 'check' | 'clock' | 'wallet' | 'handshake' | 'shield' | 'bomb' | 'arrowUp' | 'arrowDown' | 'target' | 'list';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS: Record<AdminIconName, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" {...s} />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" {...s} />,
  users: <g {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></g>,
  crown: <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" {...s} />,
  gem: <g {...s}><path d="M6 3h12l4 6-10 12L2 9l4-6Z" /><path d="M2 9h20M12 21 8 9l4-6 4 6-4 12" /></g>,
  coins: <g {...s}><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3" /></g>,
  bank: <path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" {...s} />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6M9 16h3" {...s} />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" {...s} />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h13M9 7h6" {...s} />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5" {...s} />,
  card: <g {...s}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></g>,
  trophy: <path d="M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z" {...s} />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" {...s} />,
  search: <g {...s}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></g>,
  alert: <path d="M12 3 2 20h20L12 3ZM12 10v4.5M12 17.5v.01" {...s} />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" {...s} />,
  megaphone: <path d="M3 10v4h3l7 5V5L6 10H3ZM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" {...s} />,
  file: <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5ZM14 3v5h5M9 13h6M9 17h6" {...s} />,
  plus: <path d="M12 5v14M5 12h14" {...s} />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" {...s} strokeWidth={2.6} />,
  clock: <g {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
  wallet: <g {...s}><path d="M4 7a2 2 0 0 1 2-2h12v4" /><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M16 13.5h2" /></g>,
  handshake: <path d="m11 7-3-2-5 4v5l3 2M13 7l3-2 5 4v5l-6 5-5-4M8 12l3-3 4 4M10 16l2 2" {...s} />,
  shield: <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.2 7.5 10 4.4-1.8 7.5-5.4 7.5-10v-6L12 2.5ZM9 12l2 2 4-4" {...s} />,
  bomb: <g {...s}><circle cx="10" cy="14" r="7" /><path d="m15 9 2-2M17 7l1.5-1.5M19.5 3.5l.01.01" /></g>,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" {...s} />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" {...s} />,
  target: <g {...s}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></g>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" {...s} strokeWidth={2.4} />,
};

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: AdminIconName; size?: number };

export default function AdminIcon({ name, size = 20, ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
