import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getShareLinkByCode, recordClick } from '@/lib/services/shareService';
import prisma from '@/lib/db';
import { extractPortfolioSummary } from '@/lib/utils/portfolioSummary';
import ShareRedirect from './ShareRedirect';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const link = await getShareLinkByCode(code);

  if (!link) {
    return { title: 'Not Found | GUNZscope' };
  }

  const shortAddr = `${link.address.slice(0, 6)}\u2026${link.address.slice(-4)}`;
  const title = `${shortAddr} Portfolio | GUNZscope`;
  const description = `View ${shortAddr}\u2019s GUN token balance and NFT holdings on GUNZscope.`;

  // Fetch live portfolio data from PortfolioCache
  const ogUrl = new URL(`/api/og/portfolio/${link.address}`, 'https://gunzscope.xyz');

  const cache = await prisma.portfolioCache.findFirst({
    where: { address: link.address.toLowerCase() },
    orderBy: { savedAt: 'desc' },
  });

  if (cache) {
    const summary = extractPortfolioSummary(cache.walletBlob, cache.gunPrice, cache.nftCount);
    if (summary) {
      ogUrl.searchParams.set('v', summary.totalUsd);
      ogUrl.searchParams.set('g', summary.gunBalance);
      ogUrl.searchParams.set('n', String(summary.nftCount));
      if (summary.nftPnlPct) ogUrl.searchParams.set('pnl', summary.nftPnlPct);
      if (summary.gunSpent) ogUrl.searchParams.set('gs', summary.gunSpent);
    }
  }

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

export default async function SharePage({ params }: PageProps) {
  const { code } = await params;
  const link = await getShareLinkByCode(code);

  if (!link) notFound();

  // Record the click (fire-and-forget, don't block page render)
  const headerList = await headers();
  const referrer = headerList.get('referer') ?? undefined;
  const userAgent = headerList.get('user-agent') ?? undefined;
  void recordClick(link.id, referrer, userAgent);

  // Redirect to the portfolio page — it fetches live data
  const destUrl = `/portfolio?address=${encodeURIComponent(link.address)}`;

  return <ShareRedirect destinationUrl={destUrl} />;
}
