'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

// Bouton « retour » des pages : revient à la PAGE PRÉCÉDENTE (comme le bouton retour du téléphone),
// et seulement s'il n'y en a pas (lien ouvert directement), à `fallback` (l'accueil par défaut).
// L'historique interne est compté par AppShell (sessionStorage « arena-nav »).
export default function BackLink({ fallback = '/etudiant', className, children, ...rest }: { fallback?: string; className?: string; children: ReactNode; 'aria-label'?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      className={className}
      aria-label={rest['aria-label']}
      onClick={(e) => {
        let depth = 0;
        try { depth = Number(sessionStorage.getItem('arena-nav') || '0'); } catch { /* stockage indisponible */ }
        if (depth > 1 && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
