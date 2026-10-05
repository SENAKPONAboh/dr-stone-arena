'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoHero from '@/components/ui/LogoHero';
import BackgroundCells from '@/components/ui/BackgroundCells';

export default function AnimatedIntro() {
  const router = useRouter();

  useEffect(() => {
    // Laisse jouer l'animation du logo, puis redirige
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3600);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 38%, #0b1a38 0%, #050a16 55%, #03060d 100%)' }}>
      <BackgroundCells />
      <div className="relative z-10">
        <LogoHero />
      </div>
    </div>
  );
}
