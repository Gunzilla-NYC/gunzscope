'use client';

import { useSearchParams } from 'next/navigation';
import { NoWalletPrompt } from './NoWalletPrompt';
import { InsanityDashboard } from './InsanityDashboard';

export function InsanityContent() {
  const searchParams = useSearchParams();
  const wallet = searchParams.get('wallet');

  if (!wallet) return <NoWalletPrompt />;
  return <InsanityDashboard address={wallet} />;
}
