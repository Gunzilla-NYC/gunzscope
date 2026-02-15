import { Metadata } from 'next';
import PortfolioClient from './PortfolioClient';

interface PageProps {
  searchParams: Promise<{ address?: string; debug?: string; v?: string; g?: string; n?: string; pnl?: string }>;
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

  // Build OG image URL, forwarding any pre-computed portfolio data params
  const ogUrl = new URL(`/api/og/portfolio/${address}`, 'https://gunzscope.xyz');
  if (params.v) ogUrl.searchParams.set('v', params.v);
  if (params.g) ogUrl.searchParams.set('g', params.g);
  if (params.n) ogUrl.searchParams.set('n', params.n);
  if (params.pnl) ogUrl.searchParams.set('pnl', params.pnl);
  const ogImageUrl = ogUrl.pathname + ogUrl.search;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${shortAddr} Portfolio` }],
      type: 'website',
      siteName: 'GUNZscope',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function PortfolioPage() {
  return <PortfolioClient />;
}
