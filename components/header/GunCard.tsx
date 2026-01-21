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
  const changeColor = isPositive ? 'text-[#beffd2]' : 'text-[#ff6b6b]';
  const changeSign = isPositive ? '+' : '';

  return (
    <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-4 h-full flex flex-col ${className}`}>
      {/* GUN Token header with eyebrow */}
      <div className="flex items-center gap-2.5 mb-3">
        {/* GUN Token icon */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#64ffff] to-[#96aaff] flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-black">G</span>
        </div>
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium">
            GUN
          </span>
          <div className="text-[12px] text-white/55">Native Token</div>
        </div>
      </div>

      {/* Price section */}
      <div className="mb-3">
        <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium block mb-1">
          Price
        </span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[22px] leading-[1.1] font-semibold text-white">
            ${formatGunPrice(price)}
          </span>
          <span className={`text-[13px] font-medium ${changeColor}`}>
            {changeSign}{priceChangePercent24h.toFixed(2)}%
          </span>
        </div>
        <div className={`text-[12px] ${changeColor} mt-0.5`}>
          {changeSign}${Math.abs(priceChange24h).toFixed(6)} (24h)
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 pt-3 mt-auto">
        {/* Balance section */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium block mb-0.5">
              Balance
            </span>
            <div className="text-[13px] font-medium text-white/85">
              {formatBalance(balance)} GUN
            </div>
          </div>
          <div>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium block mb-0.5">
              Value
            </span>
            <div className="text-[16px] leading-[1.2] font-medium text-[#64ffff]/85">
              ${formatUSD(value)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
