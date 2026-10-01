'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Balayage doré à l'entrée dans l'Espace Élite (une fois par session de navigation).
export default function GoldSweep() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('elite-sweep')) return;
      sessionStorage.setItem('elite-sweep', '1');
    } catch { /* stockage indisponible : on joue quand même l'animation */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1100);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <motion.div
      aria-hidden="true"
      initial={{ x: '-120%' }}
      animate={{ x: '120%' }}
      transition={{ duration: 0.95, ease: [0.4, 0, 0.2, 1] }}
      className="pointer-events-none fixed inset-y-0 left-0 z-[200] w-full"
      style={{ background: 'linear-gradient(100deg, transparent 20%, rgba(242,193,78,0.0) 30%, rgba(242,193,78,0.85) 48%, rgba(255,240,190,0.95) 52%, rgba(242,193,78,0.0) 70%, transparent 80%)' }}
    />
  );
}
