'use client';

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="font-display text-xl text-white">Something went wrong</h2>
        <p className="max-w-md text-sm text-[var(--gs-gray-3)]">
          Portfolio data couldn&apos;t be loaded. This is usually temporary &mdash; try again in a
          moment.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-[var(--gs-gray-4)]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/10 px-6 py-2 font-mono text-xs uppercase tracking-wider text-[var(--gs-lime)] transition-colors hover:bg-[var(--gs-lime)]/20"
      >
        Try Again
      </button>
    </div>
  );
}
