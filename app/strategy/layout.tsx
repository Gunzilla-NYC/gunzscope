import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategic Roadmap',
  robots: { index: false, follow: false },
};

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
