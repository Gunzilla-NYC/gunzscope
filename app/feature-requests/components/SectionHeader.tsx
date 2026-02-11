export function SectionHeader({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-1.5 h-1.5 ${color}`} />
      <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-3)]">
        {label} ({count})
      </span>
    </div>
  );
}
