import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Browse live Off The Grid marketplace listings. See prices, rarity, and recent sales across all OTG game items.',
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
