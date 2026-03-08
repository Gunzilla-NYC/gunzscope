'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0A]">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
            <p className="max-w-md text-sm text-gray-400">
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="font-mono text-[10px] text-gray-500">Error ID: {error.digest}</p>
            )}
          </div>
          <button
            onClick={reset}
            className="rounded border border-white/20 bg-white/10 px-6 py-2 text-xs uppercase tracking-wider text-white transition-colors hover:bg-white/20"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
