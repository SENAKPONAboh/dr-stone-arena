'use client';

import { Children } from 'react';
import { motion } from 'framer-motion';

// Entrée des blocs de la page en cascade (60 ms entre chaque).
export default function HomeStagger({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      {Children.toArray(children).map((child, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
          {child}
        </motion.div>
      ))}
    </div>
  );
}
