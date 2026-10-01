import type { ReactNode } from 'react';
import BackgroundCells from './BackgroundCells';
import Logo from './Logo';
import EcgLine from './EcgLine';

// Coquille commune des pages hors connexion (login, inscription, mot de passe oublié).
export const AUTH_INPUT =
  'w-full rounded-2xl border-2 border-line bg-slab-2 px-4 py-3 font-body text-ink placeholder:text-mute/60 transition-colors focus:border-mala focus:outline-none';
export const AUTH_LABEL = 'mb-2 block text-sm font-bold text-ink';
export const AUTH_BUTTON =
  'w-full rounded-2xl bg-mala px-5 py-4 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f] disabled:cursor-not-allowed disabled:opacity-50';

export default function AuthShell({ title, subtitle, wide, children }: { title: string; subtitle: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-stone p-4 py-10 font-body">
      <BackgroundCells />
      <div className={`relative w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-3xl border border-line bg-slab p-7`}>
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center"><Logo size={64} /></div>
          <h1 className="font-display text-xl font-extrabold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-mute">{subtitle}</p>
          <EcgLine className="mx-auto mt-3 h-5 w-40 opacity-80" />
        </div>
        {children}
      </div>
    </div>
  );
}
