export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatGun(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(0);
  return n.toFixed(2);
}

export function getListingScarcityColor(count: number): string {
  if (count <= 2) return '#ff44ff';
  if (count <= 5) return '#ff8800';
  if (count <= 15) return '#4488ff';
  return '#888888';
}

export function getListingScarcityLabel(count: number): string {
  if (count === 0) return 'Unlisted';
  if (count <= 2) return 'Very Scarce';
  if (count <= 5) return 'Limited';
  if (count <= 15) return 'Moderate';
  return 'Available';
}
