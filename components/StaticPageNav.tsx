import Link from 'next/link';
import Logo from '@/components/Logo';

interface StaticPageNavProps {
  backLabel?: string;
  backHref?: string;
}

/**
 * Simple fixed navbar for static pages (credits, brand, etc.).
 * Inner container matches Footer's `max-w-7xl mx-auto px-6 lg:px-10`
 * so logo and back link align with footer edges.
 */
export default function StaticPageNav({
  backLabel = 'Back to App',
  backHref = '/',
}: StaticPageNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass-effect border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="md" variant="icon" />
        </Link>
        <Link
          href={backHref}
          className="font-mono text-caption uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </nav>
  );
}
