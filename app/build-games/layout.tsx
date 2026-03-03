import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GUNZscope — OTG Arsenal Intelligence | Build Games 2026',
  description:
    'Track, analyze, and value your Off The Grid NFT portfolio with dual-track P&L, tiered valuations, and weapon intelligence across GunzChain and Solana. Built on Avalanche.',
  openGraph: {
    title: 'GUNZscope — OTG Arsenal Intelligence',
    description:
      'Cross-chain portfolio analytics for Off The Grid. Dual-track P&L, 6-tier valuation waterfall, on-chain attestations. Built on Avalanche.',
  },
};

export default function BuildGamesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
