'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import EcgLine from '@/components/ui/EcgLine';
import BackgroundCells from '@/components/ui/BackgroundCells';

export default function AnimatedIntro() {
  const router = useRouter();

  useEffect(() => {
    // Redirige vers /login après 3 secondes
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-stone">
      <BackgroundCells />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo avec animation "Pop" */}
        <div className="mb-8 animate-pop-in opacity-0">
          <Logo size={96} />
        </div>

        <h1 className="animate-fade-in-up text-center font-display text-3xl font-extrabold text-ink opacity-0" style={{ animationDelay: '0.3s' }}>
          Dr. Stone Arena
        </h1>

        <p className="mt-2 animate-fade-in-up font-display text-xs font-medium uppercase tracking-widest text-mala opacity-0" style={{ animationDelay: '0.8s' }}>
          L'Arène Médicale
        </p>

        {/* Tracé ECG sous le logo */}
        <div className="mt-6 animate-fade-in-up opacity-0" style={{ animationDelay: '1.2s' }}>
          <EcgLine className="h-10 w-60" />
        </div>
      </div>
    </div>
  );
}
