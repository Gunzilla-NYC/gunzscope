import Link from 'next/link';

/** Single source of truth for the current version string. */
export const APP_VERSION = 'v1.1.0';

/**
 * Linked version badge that navigates to /changelog.
 * Used in Navbar and home page — keeps version in sync across all pages.
 */
export default function VersionBadge({ className }: { className?: string }) {
  return (
    <Link
      href="/updates"
      className={`font-mono text-label tracking-wider uppercase px-1.5 py-0.5 text-[var(--gs-gray-3)] border border-[var(--gs-gray-1)] transition-colors hover:text-[var(--gs-lime)] hover:border-[var(--gs-lime)]/40${className ? ` ${className}` : ''}`}
    >
      {APP_VERSION} // EARLY ACCESS
    </Link>
  );
}
