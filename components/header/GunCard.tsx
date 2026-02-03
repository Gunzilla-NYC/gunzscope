'use client';

interface GunCardProps {
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  balance: number;
  className?: string;
}

/**
 * Format GUN price with 6 decimal places
 */
function formatGunPrice(price: number): string {
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

/**
 * Format token balance
 */
function formatBalance(balance: number): string {
  if (balance >= 1_000_000) {
    return `${(balance / 1_000_000).toFixed(2)}M`;
  }
  if (balance >= 1_000) {
    return `${(balance / 1_000).toFixed(2)}K`;
  }
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/**
 * Format USD value
 */
function formatUSD(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function GunCard({
  price,
  priceChange24h,
  priceChangePercent24h,
  balance,
  className = '',
}: GunCardProps) {
  const value = price * balance;
  const isPositive = priceChangePercent24h >= 0;
  const changeColor = isPositive ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]';
  const changeSign = isPositive ? '+' : '';

  return (
    <div className={`relative bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 h-full flex flex-col overflow-hidden ${className}`}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />

      {/* GUN Token header with eyebrow */}
      <div className="flex items-center gap-2.5 mb-3">
        {/* GUN Token icon */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gs-lime)] to-[var(--gs-purple)] flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-black">G</span>
        </div>
        <div>
          <span className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)]">
            GUN
          </span>
          <div className="text-[12px] text-[var(--gs-gray-4)] font-body">Native Token</div>
        </div>
      </div>

      {/* Price section */}
      <div className="mb-3">
        <span className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] block mb-1">
          Price
        </span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-[22px] leading-[1.1] font-bold text-[var(--gs-white)]">
            ${formatGunPrice(price)}
          </span>
          <span className={`font-mono text-[13px] font-medium ${changeColor}`}>
            {changeSign}{priceChangePercent24h.toFixed(2)}%
          </span>
        </div>
        <div className={`font-mono text-[12px] ${changeColor} mt-0.5`}>
          {changeSign}${Math.abs(priceChange24h).toFixed(6)} (24h)
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06] pt-3 mt-auto">
        {/* Balance section */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] block mb-0.5">
              Balance
            </span>
            <div className="font-mono text-[13px] font-medium text-[var(--gs-white-dim)]">
              {formatBalance(balance)} GUN
            </div>
          </div>
          <div>
            <span className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] block mb-0.5">
              Value
            </span>
            <div className="font-display text-[16px] leading-[1.2] font-bold text-[var(--gs-purple)]">
              ${formatUSD(value)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
