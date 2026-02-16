import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getShareLinkByCode, recordClick } from '@/lib/services/shareService';
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

  // Reuse the existing OG image route with stored portfolio data
  const ogUrl = new URL(`/api/og/portfolio/${link.address}`, 'https://gunzscope.xyz');
  if (link.totalUsd) ogUrl.searchParams.set('v', link.totalUsd);
  if (link.gunBalance) ogUrl.searchParams.set('g', link.gunBalance);
  if (link.nftCount !== null) ogUrl.searchParams.set('n', String(link.nftCount));
  if (link.nftPnlPct) ogUrl.searchParams.set('pnl', link.nftPnlPct);
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

  // Build the destination URL for client-side redirect
  const destUrl = new URL('/portfolio', 'https://gunzscope.xyz');
  destUrl.searchParams.set('address', link.address);
  if (link.totalUsd) destUrl.searchParams.set('v', link.totalUsd);
  if (link.gunBalance) destUrl.searchParams.set('g', link.gunBalance);
  if (link.nftCount !== null) destUrl.searchParams.set('n', String(link.nftCount));
  if (link.nftPnlPct) destUrl.searchParams.set('pnl', link.nftPnlPct);

  return <ShareRedirect destinationUrl={destUrl.pathname + destUrl.search} />;
}
