'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';

/**
 * Page transition wrapper.
 *
 * - Browsers WITH View Transitions API: transition handled by CSS in globals.css,
 *   this renders children directly (no double-animation).
 * - Browsers WITHOUT View Transitions (Firefox, older Safari): framer-motion
 *   provides a fade + slide-up entrance on every navigation.
 *
 * template.tsx re-mounts on every route change (unlike layout.tsx),
 * so the entrance animation fires on each navigation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const supportsVT = useRef(
    typeof document !== 'undefined' && 'startViewTransition' in document
  );

  if (supportsVT.current) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
