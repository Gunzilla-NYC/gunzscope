export function VoteButton({
  direction,
  active,
  disabled,
  onClick,
}: {
  direction: 'up' | 'down';
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isUp = direction === 'up';
  const activeColor = isUp ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-loss)]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`p-1 transition-colors ${
        disabled
          ? 'text-[var(--gs-gray-1)] cursor-not-allowed'
          : active
            ? activeColor
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] cursor-pointer'
      }`}
      aria-label={isUp ? 'Upvote' : 'Downvote'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        {isUp ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        )}
      </svg>
    </button>
  );
}
