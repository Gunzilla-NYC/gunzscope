import { Metadata } from 'next';
import { getReferrerBySlug } from '@/lib/services/referralService';
import ReferralRedirect from './ReferralRedirect';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const referrer = await getReferrerBySlug(slug);

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
  const referrer = await getReferrerBySlug(slug.toLowerCase());

  // Always render redirect — even for invalid slugs (no error page)
  return <ReferralRedirect slug={referrer ? slug.toLowerCase() : null} />;
}
