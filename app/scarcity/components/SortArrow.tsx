import type { ScarcitySortField } from '@/lib/hooks/useScarcity';

export function SortArrow({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) return <span className="text-white/20 ml-1">&uarr;</span>;
  return (
    <span className="text-[var(--gs-lime)] ml-1">
      {order === 'desc' ? '\u2193' : '\u2191'}
    </span>
  );
}

export const SORT_COLUMNS: { field: ScarcitySortField; label: string; shortLabel: string }[] = [
  { field: 'listingCount', label: 'Listed', shortLabel: 'Listed' },
  { field: 'floorPriceGun', label: 'Floor (GUN)', shortLabel: 'Floor' },
  { field: 'recentSales', label: '7d Sales', shortLabel: 'Sales' },
  { field: 'itemName', label: 'Item Name', shortLabel: 'Name' },
];
