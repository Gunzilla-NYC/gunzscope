import { cache } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getReferrerBySlug, getReferrerByPreviousSlug } from '@/lib/services/referralService';
import ReferralRedirect from './ReferralRedirect';

// Per-request deduplication: generateMetadata + page component share the same queries
const getCachedReferrer = cache((slug: string) => getReferrerBySlug(slug));
const getCachedPreviousReferrer = cache((slug: string) => getReferrerByPreviousSlug(slug));

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  let referrer = await getCachedReferrer(normalizedSlug);

  // Check previous slug for 30-day redirect (metadata still resolves for crawlers)
  if (!referrer) {
    referrer = await getCachedPreviousReferrer(normalizedSlug);
  }

  const title = referrer
    ? `Join GUNZscope via ${referrer.slug}`
    : 'GUNZscope — Portfolio Tracker for Off The Grid';
  const description = 'Track your GUN tokens, NFTs, and portfolio performance on GUNZscope.';

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'GUNZscope' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function ReferralPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  const referrer = await getCachedReferrer(normalizedSlug);

  if (referrer) {
    return <ReferralRedirect slug={normalizedSlug} />;
  }

  // Check if this is a previous slug — 301 redirect to the current one
  const oldRef = await getCachedPreviousReferrer(normalizedSlug);
  if (oldRef) {
    redirect(`/r/${oldRef.slug}`);
  }

  // Unknown slug — redirect to home
  return <ReferralRedirect slug={null} />;
}
