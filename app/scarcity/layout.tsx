import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scarcity Explorer',
  description: 'Discover the rarest Off The Grid items. Browse supply data, listing scarcity, and trait distribution.',
};

export default function ScarcityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
