'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Halo lumineux en fond */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
      
      {/* Contenu animé */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo avec animation "Pop" */}
        <div className="opacity-0 animate-pop-in w-24 h-24 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
          <span className="text-6xl">🧠</span>
        </div>
        
        {/* Titre avec animation Fondu vers le haut */}
        <h1 className="opacity-0 animate-fade-in-up text-3xl font-extrabold text-white text-center" style={{ animationDelay: '0.3s' }}>
          Dr. Stone Arena
        </h1>
        
        <p className="opacity-0 animate-fade-in-up text-emerald-300 font-medium tracking-widest uppercase text-sm mt-2" style={{ animationDelay: '0.8s' }}>
          L'Arène Médicale
        </p>
      </div>

      {/* Cercle de chargement en bas */}
      <div className="absolute bottom-12 opacity-0 animate-fade-in-up" style={{ animationDelay: '1.5s' }}>
        <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}