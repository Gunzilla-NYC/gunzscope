import { ChangeDisplay } from './types';

/**
 * Format a portfolio change value with sign and color.
 */
export function formatChangeDisplay(
  value: number | null,
  isPercent: boolean = false
): ChangeDisplay {
  if (value === null) {
    return { text: 'Calculating\u2026', colorClass: 'text-[var(--gs-gray-2)]', isCalculating: true };
  }

  const colorClass = value > 0 ? 'text-[#beffd2]' : value < 0 ? 'text-[#ff6b6b]' : 'text-[var(--gs-gray-3)]';

  if (isPercent) {
    const sign = value >= 0 ? '+' : '';
    return { text: `${sign}${value.toFixed(2)}%`, colorClass, isCalculating: false };
  }

  const absFormatted = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const text = value >= 0 ? `+$${absFormatted}` : `-$${absFormatted}`;
  return { text, colorClass, isCalculating: false };
}
