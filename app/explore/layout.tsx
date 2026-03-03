import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onchain Explorer',
  description: 'Browse portfolio attestations on Avalanche C-Chain. Verified on-chain, stored permanently on Autonomys.',
  alternates: { canonical: '/explore' },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
