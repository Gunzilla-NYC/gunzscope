'use client';

import { useEffect, useRef } from 'react';

interface ReferralTrackingConfig {
  /** Connected wallet address from Dynamic SDK */
  primaryWalletAddress: string | undefined;
  /** True when portfolio data is loaded and ready */
  isPortfolioLoaded: boolean;
}

/**
 * Fires referral funnel events when a referred visitor connects their wallet
 * and loads their portfolio. Reads `gs_ref` + `gs_ref_session` from localStorage
 * (set by /r/[slug] redirect page).
 *
 * Each event fires at most once per page load via refs.
 */
export function useReferralTracking({ primaryWalletAddress, isPortfolioLoaded }: ReferralTrackingConfig): void {
  const walletTrackedRef = useRef(false);
  const portfolioTrackedRef = useRef(false);

  // Fire wallet_connected when wallet appears
  useEffect(() => {
    if (!primaryWalletAddress || walletTrackedRef.current) return;
    const slug = localStorage.getItem('gs_ref');
    const sessionId = localStorage.getItem('gs_ref_session');
    if (!slug || !sessionId) return;

    walletTrackedRef.current = true;
    fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'wallet_connected', walletAddress: primaryWalletAddress, sessionId }),
    }).catch(() => {});
  }, [primaryWalletAddress]);

  // Fire portfolio_loaded when NFTs appear
  useEffect(() => {
    if (!isPortfolioLoaded || !primaryWalletAddress || portfolioTrackedRef.current) return;
    const slug = localStorage.getItem('gs_ref');
    const sessionId = localStorage.getItem('gs_ref_session');
    if (!slug || !sessionId) return;

    portfolioTrackedRef.current = true;
    fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'portfolio_loaded', walletAddress: primaryWalletAddress, sessionId }),
    }).catch(() => {})
      .then(() => {
        // Referral complete — clear localStorage
        localStorage.removeItem('gs_ref');
        localStorage.removeItem('gs_ref_session');
      });
  }, [isPortfolioLoaded, primaryWalletAddress]);
}
