'use client';

import LoadingSpinner from './ui/LoadingSpinner';

/**
 * Validates if the given string is a valid EVM address.
 * Must be 0x prefix followed by exactly 40 hexadecimal characters.
 */
function isValidEVMAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Truncates an Ethereum address to display format.
 * Format: 0xF943...c72F (first 6 + last 4 characters)
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface WalletSearchDropdownProps {
  /** Current search input value */
  searchValue: string;
  /** Callback when user clicks the address row to navigate */
  onNavigate: (address: string) => void;
  /** Callback to add address to watchlist, returns success status */
  onAddToWatchlist: (address: string) => Promise<boolean>;
  /** Callback to add address to portfolio, returns success status */
  onAddToPortfolio: (address: string) => Promise<boolean>;
  /** Whether the address is already in the watchlist */
  isInWatchlist?: boolean;
  /** Whether the address is already in the portfolio */
  isInPortfolio?: boolean;
  /** Loading state for watchlist add action */
  isAddingWatchlist?: boolean;
  /** Loading state for portfolio add action */
  isAddingPortfolio?: boolean;
  /** Whether the user has reached the portfolio address limit (5) */
  isAtPortfolioLimit?: boolean;
}

export default function WalletSearchDropdown({
  searchValue,
  onNavigate,
  onAddToWatchlist,
  onAddToPortfolio,
  isInWatchlist = false,
  isInPortfolio = false,
  isAddingWatchlist = false,
  isAddingPortfolio = false,
  isAtPortfolioLimit = false,
}: WalletSearchDropdownProps) {
  // Only show dropdown for valid EVM addresses
  const isValid = isValidEVMAddress(searchValue);

  if (!isValid) {
    return null;
  }

  const truncatedAddress = truncateAddress(searchValue);
  const normalizedAddress = searchValue.toLowerCase();

  const handleRowClick = () => {
    onNavigate(normalizedAddress);
  };

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row navigation
    if (isInWatchlist || isAddingWatchlist) return;
    await onAddToWatchlist(normalizedAddress);
  };

  const handlePortfolioClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row navigation
    if (isInPortfolio || isAddingPortfolio) return;
    await onAddToPortfolio(normalizedAddress);
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg overflow-hidden z-50">
      {/* Section header */}
      <div className="px-3 pt-3 pb-1">
        <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">
          Wallets
        </span>
      </div>

      {/* Wallet row */}
      <div
        onClick={handleRowClick}
        className="flex items-center justify-between p-3 hover:bg-[var(--gs-dark-3)] transition-colors cursor-pointer"
      >
        {/* Truncated address */}
        <span className="font-mono text-sm text-[var(--gs-white)]">
          {truncatedAddress}
        </span>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Watchlist button */}
          <button
            onClick={handleWatchlistClick}
            disabled={isInWatchlist || isAddingWatchlist}
            className={`
              font-mono text-[11px] tracking-wide uppercase px-3 py-1.5
              bg-transparent border transition-all
              flex items-center gap-1.5
              ${isInWatchlist
                ? 'text-[var(--gs-lime)] border-[var(--gs-lime)]/50 cursor-default'
                : isAddingWatchlist
                  ? 'text-[var(--gs-gray-3)] border-[var(--gs-gray-1)] cursor-wait'
                  : 'text-[var(--gs-gray-3)] border-[var(--gs-gray-1)] hover:border-[var(--gs-lime)] hover:text-[var(--gs-lime)]'
              }
            `}
          >
            {isAddingWatchlist ? (
              <>
                <LoadingSpinner size="sm" className="w-3 h-3" />
                <span>Adding...</span>
              </>
            ) : isInWatchlist ? (
              '✓ Watching'
            ) : (
              '+ Watchlist'
            )}
          </button>

          {/* Portfolio button */}
          {isAtPortfolioLimit && !isInPortfolio ? (
            <span className="font-mono text-[11px] tracking-wide uppercase px-3 py-1.5 text-[var(--gs-gray-2)]">
              Limit (5)
            </span>
          ) : (
            <button
              onClick={handlePortfolioClick}
              disabled={isInPortfolio || isAddingPortfolio}
              className={`
                font-mono text-[11px] tracking-wide uppercase px-3 py-1.5
                bg-transparent border transition-all
                flex items-center gap-1.5
                ${isInPortfolio
                  ? 'text-[var(--gs-purple)] border-[var(--gs-purple)]/50 cursor-default'
                  : isAddingPortfolio
                    ? 'text-[var(--gs-gray-3)] border-[var(--gs-gray-1)] cursor-wait'
                    : 'text-[var(--gs-gray-3)] border-[var(--gs-gray-1)] hover:border-[var(--gs-purple)] hover:text-[var(--gs-purple)]'
                }
              `}
            >
              {isAddingPortfolio ? (
                <>
                  <LoadingSpinner size="sm" className="w-3 h-3" />
                  <span>Adding...</span>
                </>
              ) : isInPortfolio ? (
                '✓ Added'
              ) : (
                '+ Portfolio'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export utility functions for use in other components
export { isValidEVMAddress, truncateAddress };
