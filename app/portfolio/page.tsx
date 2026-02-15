import { Metadata } from 'next';
import PortfolioClient from './PortfolioClient';

interface PageProps {
  searchParams: Promise<{ address?: string; debug?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const address = params.address;

  if (!address) {
    return {
      title: 'Portfolio | GUNZscope',
      description: 'Track your GUN tokens and NFTs across GunzChain.',
    };
  }

  const shortAddr = `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
  const title = `${shortAddr} Portfolio | GUNZscope`;
  const description = `View ${shortAddr}\u2019s GUN token balance and NFT holdings on GUNZscope.`;
  const ogUrl = `/api/og/portfolio/${address}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${shortAddr} Portfolio` }],
      type: 'website',
      siteName: 'GUNZscope',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function PortfolioPage() {
  return <PortfolioClient />;
}
