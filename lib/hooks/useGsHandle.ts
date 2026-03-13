'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getGsHandle,
  getHandleChangeFee,
  resolveHandle,
  setHandle as setHandleOnChain,
  ensureAvalancheChain,
  getSignerFromProvider,
  getCChainProvider,
} from '@/lib/attestation/contract';

export type HandleStatus =
  | 'idle'
  | 'checking'
  | 'switching-chain'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'error';

interface UseGsHandleReturn {
  currentHandle: string | null;
  hasRegistered: boolean;
  changeFee: bigint | null;
  loadingHandle: boolean;
  checkAvailability: (handle: string) => Promise<boolean>;
  registerHandle: (handle: string) => Promise<void>;
  status: HandleStatus;
  txHash: string | null;
  error: string | null;
  reset: () => void;
}

export function useGsHandle(
  walletAddress: string | undefined,
  walletProvider: unknown,
): UseGsHandleReturn {
  const [currentHandle, setCurrentHandle] = useState<string | null>(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [changeFee, setChangeFee] = useState<bigint | null>(null);
  const [loadingHandle, setLoadingHandle] = useState(false);
  const [status, setStatus] = useState<HandleStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registeringRef = useRef(false);

  // Load on-chain handle state when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setCurrentHandle(null);
      setHasRegistered(false);
      setChangeFee(null);
      return;
    }

    let cancelled = false;
    setLoadingHandle(true);

    const provider = getCChainProvider();

    Promise.all([
      getGsHandle(provider, walletAddress),
      getHandleChangeFee(provider),
    ])
      .then(([handle, fee]) => {
        if (cancelled) return;
        setCurrentHandle(handle);
        setHasRegistered(handle !== null);
        setChangeFee(fee);
      })
      .catch(() => {
        // RPC error — leave defaults
      })
      .finally(() => {
        if (!cancelled) setLoadingHandle(false);
      });

    return () => { cancelled = true; };
  }, [walletAddress]);

  const checkAvailability = useCallback(async (handle: string): Promise<boolean> => {
    setStatus('checking');
    try {
      const provider = getCChainProvider();
      const owner = await resolveHandle(provider, handle);
      const isZero = owner === '0x0000000000000000000000000000000000000000';
      const isOwn = walletAddress
        ? owner.toLowerCase() === walletAddress.toLowerCase()
        : false;
      setStatus('idle');
      return isZero || isOwn;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to check availability';
      setError(msg);
      setStatus('error');
      return false;
    }
  }, [walletAddress]);

  const registerHandle = useCallback(async (handle: string): Promise<void> => {
    if (registeringRef.current) return;
    if (!walletAddress || !walletProvider) {
      setError('No wallet connected');
      setStatus('error');
      return;
    }

    registeringRef.current = true;
    setError(null);
    setTxHash(null);

    try {
      // Switch to Avalanche C-Chain
      setStatus('switching-chain');
      await ensureAvalancheChain(walletProvider);

      // Get signer
      setStatus('signing');
      const signer = await getSignerFromProvider(walletProvider);

      // Determine fee: first registration is free, changes cost changeFee
      const fee = hasRegistered && changeFee ? changeFee : undefined;

      // Submit transaction
      setStatus('confirming');
      const result = await setHandleOnChain(signer, handle, fee);
      setTxHash(result.txHash);

      // Update local state
      setCurrentHandle(handle);
      setHasRegistered(true);
      setStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Handle registration failed';

      if (msg.includes('user rejected') || msg.includes('ACTION_REJECTED')) {
        setStatus('idle');
      } else if (msg.includes('Handle taken')) {
        setError('This handle was just claimed by someone else. Try a different one.');
        setStatus('error');
      } else {
        setError(msg);
        setStatus('error');
      }
    } finally {
      registeringRef.current = false;
    }
  }, [walletAddress, walletProvider, hasRegistered, changeFee]);

  const reset = useCallback(() => {
    setError(null);
    setTxHash(null);
    setStatus('idle');
  }, []);

  return {
    currentHandle,
    hasRegistered,
    changeFee,
    loadingHandle,
    checkAvailability,
    registerHandle,
    status,
    txHash,
    error,
    reset,
  };
}
