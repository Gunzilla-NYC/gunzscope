'use client';

import { motion } from 'framer-motion';

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
 *
 * HYDRATION FIX: The first render must match the server (which has no `document`).
 * We use a module-level flag so the initial SSR/hydration render outputs plain
 * children with no wrapper, avoiding a mismatch between server (<motion.div>)
 * and client (<Fragment>) in VT-capable browsers. Subsequent client-side
 * navigations then use framer-motion or skip it if VT is supported.
 */

// Module-level: survives re-mounts (template re-mounts on each navigation)
let isInitialRender = true;

export default function Template({ children }: { children: React.ReactNode }) {
  // First render: match server output (no motion.div wrapper)
  if (isInitialRender) {
    isInitialRender = false;
    return <>{children}</>;
  }

  // Subsequent client-side navigations: VT browsers use CSS transitions
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    return <>{children}</>;
  }

  // Non-VT browsers: framer-motion fade + slide entrance
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
