export function SortArrow({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) return <span className="text-white/20 ml-1">&uarr;</span>;
  return (
    <span className="text-[var(--gs-lime)] ml-1">
      {order === 'desc' ? '\u2193' : '\u2191'}
    </span>
  );
}
