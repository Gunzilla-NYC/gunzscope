const NFT_CONTRACT = '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';

export function formatGunPrice(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(0);
  return n.toFixed(2);
}

export function formatUsdPrice(gunAmount: number, gunPrice: number): string {
  const usd = gunAmount * gunPrice;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export function buildOpenSeaUrl(tokenId: string): string {
  return `https://opensea.io/assets/gunz/${NFT_CONTRACT}/${tokenId}`;
}

export function buildCollectionUrl(): string {
  return 'https://opensea.io/collection/off-the-grid';
}
