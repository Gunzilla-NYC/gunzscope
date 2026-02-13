import { useState, useEffect, useRef } from 'react';
import { WalletData } from '@/lib/types';

interface AutoLoadConfig {
  initialAddress: string | null;
  primaryWalletAddress: string | undefined;
  isAuthenticated: boolean;
  portfolioAddresses: Array<{ address: string }>;
  walletData: WalletData | null;
  loading: boolean;
  onSubmit: (address: string) => void;
  onDisconnect: () => void;
  onSetSearchAddress: (address: string) => void;
}

/**
 * Consolidates the 5 auto-load / init effects from the portfolio page:
 *
 * 1. URL param auto-load (?address=0x...)
 * 2. Connected wallet auto-load (Dynamic SDK)
 * 3. SDK init timeout → no-wallet CTA
 * 4. "Found it" transition message
 * 5. Wallet disconnect detection
 *
 * Also owns the related state: noWalletDetected, showFoundMessage, sdkInitPhase.
 */
export function usePortfolioAutoLoad({
  initialAddress,
  primaryWalletAddress,
  isAuthenticated,
  portfolioAddresses,
  walletData,
  loading,
  onSubmit,
  onDisconnect,
  onSetSearchAddress,
}: AutoLoadConfig) {
  const [noWalletDetected, setNoWalletDetected] = useState(false);
  const [showFoundMessage, setShowFoundMessage] = useState(false);
  const [sdkInitPhase, setSdkInitPhase] = useState(0);

  const initialAddressLoaded = useRef(false);
  const isSharedLinkLoad = useRef(false);
  const autoLoadRef = useRef(false);
  const prevWalletRef = useRef(primaryWalletAddress);

  // 1. URL param auto-load
  useEffect(() => {
    if (initialAddress && !initialAddressLoaded.current) {
      initialAddressLoaded.current = true;
      isSharedLinkLoad.current = true;
      onSetSearchAddress(initialAddress);
      onSubmit(initialAddress);
    }
  }, [initialAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Auto-load connected wallet (or first portfolio address for email-only users)
  useEffect(() => {
    if (walletData || loading || initialAddress || autoLoadRef.current) return;

    if (primaryWalletAddress) {
      autoLoadRef.current = true;
      setNoWalletDetected(false);
      onSetSearchAddress(primaryWalletAddress);
      onSubmit(primaryWalletAddress);
      return;
    }

    if (isAuthenticated && portfolioAddresses.length > 0) {
      autoLoadRef.current = true;
      setNoWalletDetected(false);
      onSetSearchAddress(portfolioAddresses[0].address);
      onSubmit(portfolioAddresses[0].address);
      return;
    }

    // No connected wallet — check sessionStorage for a previously analyzed address
    const lastSearched = typeof window !== 'undefined'
      ? sessionStorage.getItem('gs_last_search')
      : null;

    if (lastSearched) {
      autoLoadRef.current = true;
      setNoWalletDetected(false);
      onSetSearchAddress(lastSearched);
      onSubmit(lastSearched);
      return;
    }

    // No prior session either — give Dynamic SDK time to initialize, then show CTA
    const timer = setTimeout(() => {
      if (!autoLoadRef.current) {
        setNoWalletDetected(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryWalletAddress, isAuthenticated, portfolioAddresses, walletData, loading, initialAddress]);

  // 3. SDK init message cycling
  const isWaitingForSdk = !walletData && !loading && !noWalletDetected && !showFoundMessage;
  useEffect(() => {
    if (!isWaitingForSdk) { setSdkInitPhase(0); return; }
    const t = setTimeout(() => setSdkInitPhase(1), 2000);
    return () => clearTimeout(t);
  }, [isWaitingForSdk]);

  // 4. "Found it" transition message
  useEffect(() => {
    if (noWalletDetected && !walletData && !loading) {
      setShowFoundMessage(true);
      const t = setTimeout(() => setShowFoundMessage(false), 2000);
      return () => clearTimeout(t);
    }
  }, [noWalletDetected, walletData, loading]);

  // 5. Wallet disconnect detection
  useEffect(() => {
    const prev = prevWalletRef.current;
    const curr = primaryWalletAddress;
    prevWalletRef.current = curr;

    if (prev && !curr && walletData) {
      onDisconnect();
      autoLoadRef.current = false;
      setNoWalletDetected(true);
    }
  }, [primaryWalletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    noWalletDetected,
    setNoWalletDetected,
    showFoundMessage,
    sdkInitPhase,
    isWaitingForSdk,
    isSharedLinkLoad,
  };
}
