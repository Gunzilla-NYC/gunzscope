'use client';

import { useCallback, useState } from 'react';

/**
 * Build the verification message for EIP-191 personal_sign.
 * Must match the format the server parses in /api/portfolio-addresses/[id]/verify.
 */
function buildVerificationMessage(
  targetAddress: string,
  primaryAddress: string,
  nonce: number
): string {
  return [
    'Verify wallet ownership for GUNZscope.',
    `Wallet: ${targetAddress.toLowerCase()}`,
    `Portfolio: ${primaryAddress.toLowerCase()}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

/**
 * Find the real MetaMask provider, bypassing Dynamic Labs' proxy.
 * Dynamic overrides window.ethereum — we need the actual extension provider.
 */
function getMetaMaskProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined' || !window.ethereum) return null;

  // EIP-6963: multiple wallet extensions register in providers array
  const providers = (window.ethereum as MetaMaskEthereum).providers;
  if (Array.isArray(providers)) {
    const mm = providers.find((p: MetaMaskEthereum) => p.isMetaMask && !p.isDynamic);
    if (mm) return mm;
  }

  // Single provider — check it's actually MetaMask, not Dynamic's proxy
  if ((window.ethereum as MetaMaskEthereum).isMetaMask && !(window.ethereum as MetaMaskEthereum).isDynamic) {
    return window.ethereum as EIP1193Provider;
  }

  // Fallback: use whatever is available (might be Dynamic's proxy)
  return window.ethereum as EIP1193Provider;
}

// Minimal typing for the provider
interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface MetaMaskEthereum extends EIP1193Provider {
  isMetaMask?: boolean;
  isDynamic?: boolean;
  providers?: MetaMaskEthereum[];
}

interface UseWalletVerificationReturn {
  /** Address currently being verified (null if idle) */
  verifying: string | null;
  /** Error message from the last attempt */
  error: string | null;
  /** Address that the error belongs to (null if no error) */
  errorAddress: string | null;
  /** Clear the error */
  clearError: () => void;
  /** Trigger verification: sign with target wallet, then call server */
  requestVerification: (
    targetAddress: string,
    portfolioAddressId: string,
    serverVerify: (id: string, message: string, signature: string) => Promise<boolean>,
  ) => Promise<boolean>;
}

/**
 * Hook for wallet ownership verification via EIP-191 personal_sign.
 *
 * Bypasses Dynamic SDK's window.ethereum proxy to talk directly to MetaMask,
 * since the user needs to sign with a DIFFERENT wallet than their Dynamic primary.
 */
export function useWalletVerification(
  primaryWalletAddress: string | undefined
): UseWalletVerificationReturn {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAddress, setErrorAddress] = useState<string | null>(null);

  const clearError = useCallback(() => { setError(null); setErrorAddress(null); }, []);

  const requestVerification = useCallback(
    async (
      targetAddress: string,
      portfolioAddressId: string,
      serverVerify: (id: string, message: string, signature: string) => Promise<boolean>,
    ): Promise<boolean> => {
      if (!primaryWalletAddress) {
        setError('No primary wallet connected');
        return false;
      }

      setVerifying(targetAddress);
      setError(null);

      try {
        const provider = getMetaMaskProvider();
        if (!provider) {
          throw new Error('No wallet extension detected. Install MetaMask to verify wallets.');
        }

        // Force MetaMask to show the account picker popup
        await provider.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });

        // Now get the accounts the user authorized
        const accounts = await provider.request({
          method: 'eth_accounts',
        }) as string[];

        const normalizedTarget = targetAddress.toLowerCase();
        const connected = accounts.map((a: string) => a.toLowerCase());

        if (!connected.includes(normalizedTarget)) {
          throw new Error(
            `Wrong account selected. Choose ${targetAddress.slice(0, 6)}…${targetAddress.slice(-4)} in MetaMask and try again.`
          );
        }

        // Build message with nonce for replay protection
        const nonce = Date.now();
        const message = buildVerificationMessage(targetAddress, primaryWalletAddress, nonce);

        // Request personal_sign with the authorized account
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, normalizedTarget],
        });

        // Send to server for verification
        const success = await serverVerify(portfolioAddressId, message, signature as string);
        if (!success) {
          throw new Error('Server rejected the signature. Make sure you signed with the correct wallet.');
        }

        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Verification failed';
        // User rejected = not an error worth showing
        if (msg.includes('user rejected') || msg.includes('User denied') || msg.includes('ACTION_REJECTED')) {
          // Silent — user just cancelled
        } else {
          setError(msg);
          setErrorAddress(targetAddress);
        }
        return false;
      } finally {
        setVerifying(null);
      }
    },
    [primaryWalletAddress]
  );

  return { verifying, error, errorAddress, clearError, requestVerification };
}
