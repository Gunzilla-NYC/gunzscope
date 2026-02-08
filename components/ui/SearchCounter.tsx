'use client';

interface SearchCounterProps {
  searchCount: number;
  totalSearches: number;
  onConnect: () => void;
}

export default function SearchCounter({ searchCount, totalSearches, onConnect }: SearchCounterProps) {
  const remaining = Math.max(0, totalSearches - searchCount);

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--gs-dark-2)] border border-white/[0.06] clip-corner-sm w-fit">
      {/* Dots */}
      <div className="flex items-center gap-1">
        {Array.from({ length: totalSearches }).map((_, i) => (
          <span
            key={i}
            className={`block size-1.5 rounded-full transition-colors ${
              i < searchCount
                ? 'bg-[var(--gs-lime)]'
                : 'bg-[var(--gs-gray-1)] border border-white/[0.08]'
            }`}
          />
        ))}
      </div>

      {/* Counter text */}
      <span className="font-mono text-caption tabular-nums text-[var(--gs-gray-3)]">
        {searchCount} of {totalSearches} free lookups
      </span>

      <span className="text-[var(--gs-gray-1)]">&middot;</span>

      {/* Connect link */}
      <button
        onClick={onConnect}
        className="font-mono text-caption text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors cursor-pointer"
      >
        Connect for unlimited
      </button>
    </div>
  );
}
