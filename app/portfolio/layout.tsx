import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Track your GUN tokens and OTG NFTs. Real-time portfolio value, P&L, and acquisition history on GunzChain.',
  alternates: {
    canonical: '/portfolio',
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
