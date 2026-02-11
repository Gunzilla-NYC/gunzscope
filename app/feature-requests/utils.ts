export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-[var(--gs-lime)]/10', text: 'text-[var(--gs-lime)]', label: 'Open' },
  planned: { bg: 'bg-[var(--gs-purple)]/10', text: 'text-[var(--gs-purple)]', label: 'Planned' },
  completed: { bg: 'bg-[var(--gs-profit)]/10', text: 'text-[var(--gs-profit)]', label: 'Done' },
  declined: { bg: 'bg-[var(--gs-loss)]/10', text: 'text-[var(--gs-loss)]', label: 'Declined' },
};

// Stop words excluded from similarity matching
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'to', 'in', 'for', 'of', 'and', 'or', 'on',
  'be', 'i', 'me', 'my', 'we', 'can', 'do', 'so', 'up', 'if', 'no', 'not',
  'add', 'make', 'want', 'would', 'should', 'could', 'have', 'with', 'this',
  'that', 'from', 'but', 'are', 'was', 'has', 'more', 'like', 'also', 'get',
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const word of a) {
    if (b.has(word)) overlap++;
  }
  return overlap / Math.min(a.size, b.size);
}
