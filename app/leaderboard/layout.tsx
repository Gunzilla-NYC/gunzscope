import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'See the top GUN token holders and NFT collectors on GunzChain. Compare your rank with the community.',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
