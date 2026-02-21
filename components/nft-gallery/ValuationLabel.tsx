/**
 * Valuation Method Label
 *
 * Tiny inline label showing how an NFT's P&L was calculated.
 * Renders nothing when valuation is null.
 */

import type { ValuationMethod } from '@/lib/nft/valuationMethod';

interface ValuationLabelProps {
  valuation: ValuationMethod | null;
  className?: string;
}

export function ValuationLabel({ valuation, className }: ValuationLabelProps) {
  if (!valuation) return null;

  // Tier 4 (GUN Δ) gets a subtle lightning prefix
  // Tier 5 (EST.) gets a tilde prefix
  const prefix = valuation.tier === 4 ? '\u26A1\uFE0E ' : valuation.tier === 5 ? '~' : '';

  const colorClass = 'text-[var(--gs-gray-3)]';

  return (
    <span
      className={`font-mono text-[8px] uppercase tracking-widest ${colorClass}${className ? ` ${className}` : ''}`}
      title={valuation.description}
    >
      {prefix}{valuation.label}
    </span>
  );
}
