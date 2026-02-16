'use client';

/**
 * Page transition wrapper.
 *
 * - Browsers WITH View Transitions API: transition handled by CSS in globals.css,
 *   this renders children directly (no double-animation).
 * - Browsers WITHOUT View Transitions (Firefox, older Safari): a CSS fade + slide-up
 *   entrance fires on every navigation.
 *
 * template.tsx re-mounts on every route change (unlike layout.tsx),
 * so the entrance animation fires on each navigation.
 *
 * HYDRATION FIX: The first render must match the server (which has no `document`).
 * We use a module-level flag so the initial SSR/hydration render outputs plain
 * children with no wrapper, avoiding a mismatch. Subsequent client-side
 * navigations then use the CSS animation or skip it if VT is supported.
 */

// Module-level: survives re-mounts (template re-mounts on each navigation)
let isInitialRender = true;

export default function Template({ children }: { children: React.ReactNode }) {
  // First render: match server output (no animation wrapper)
  if (isInitialRender) {
    isInitialRender = false;
    return <>{children}</>;
  }

  // Subsequent client-side navigations: VT browsers use CSS transitions
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    return <>{children}</>;
  }

  // Non-VT browsers: CSS fade + slide entrance (reuses globals.css keyframe)
  return (
    <div
      style={{
        animation: 'fade-in-up 0.3s cubic-bezier(0, 0, 0.2, 1) both',
      }}
    >
      {children}
    </div>
  );
}
