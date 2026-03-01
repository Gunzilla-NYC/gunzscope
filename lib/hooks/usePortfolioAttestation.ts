'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NFT } from '@/lib/types';
import { buildPortfolioTree, computeTotalValueWei } from '@/lib/attestation/merkleTree';
import {
  submitAttestation,
  getLatestAttestation,
  getCChainProvider,
  getSignerFromProvider,
  ensureAvalancheChain,
  type OnChainAttestation,
} from '@/lib/attestation/contract';

export type AttestationStatus =
  | 'idle'
  | 'building'
  | 'switching-chain'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'error';

interface UsePortfolioAttestationResult {
  /** Trigger the attestation flow */
  attest: () => Promise<void>;
  /** Current step in the flow */
  status: AttestationStatus;
  /** Transaction hash on success */
  txHash: string | null;
  /** Attestation index on success */
  attestationId: number | null;
  /** Error message on failure */
  error: string | null;
  /** Most recent existing attestation for this wallet (null = none yet) */
  latestAttestation: OnChainAttestation | null;
  /** Whether we're loading the existing attestation */
  loadingExisting: boolean;
}

/**
 * Orchestrates the portfolio attestation flow:
 *   build Merkle tree → switch chain → sign tx → confirm → done
 */
export function usePortfolioAttestation(
  walletAddress: string | undefined,
  nfts: NFT[],
  walletProvider: unknown,
): UsePortfolioAttestationResult {
  const [status, setStatus] = useState<AttestationStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [attestationId, setAttestationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestAttestation, setLatestAttestation] = useState<OnChainAttestation | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Prevent double-fire
  const attestingRef = useRef(false);

  // Check for existing attestation on mount
  useEffect(() => {
    if (!walletAddress) return;

    let cancelled = false;
    setLoadingExisting(true);

    const provider = getCChainProvider();
    getLatestAttestation(provider, walletAddress)
      .then((att) => {
        if (!cancelled) setLatestAttestation(att);
      })
      .catch(() => {
        // No attestation or RPC error — leave null
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => { cancelled = true; };
  }, [walletAddress]);

  const attest = useCallback(async () => {
    if (attestingRef.current) return;
    if (!walletAddress || !walletProvider || nfts.length === 0) {
      setError('No wallet connected or no NFTs to attest');
      setStatus('error');
      return;
    }

    attestingRef.current = true;
    setError(null);
    setTxHash(null);
    setAttestationId(null);

    try {
      // Step 1: Build Merkle tree
      setStatus('building');
      const { root, leafCount } = buildPortfolioTree(nfts);
      const totalValueWei = computeTotalValueWei(nfts);

      // Get current block number from C-Chain
      const cchainProvider = getCChainProvider();
      const blockNumber = await cchainProvider.getBlockNumber();

      // Placeholder metadata URI until IPFS integration
      const metadataURI = `data:application/json,{"wallet":"${walletAddress}","items":${leafCount},"block":${blockNumber}}`;

      // Step 2: Switch to Avalanche C-Chain if needed
      setStatus('switching-chain');
      await ensureAvalancheChain(walletProvider);

      // Step 3: Get signer and submit
      setStatus('signing');
      const signer = await getSignerFromProvider(walletProvider);

      setStatus('confirming');
      const result = await submitAttestation(signer, {
        blockNumber,
        merkleRoot: root,
        totalValueGun: totalValueWei,
        itemCount: leafCount,
        metadataURI,
      });

      setTxHash(result.txHash);
      setAttestationId(result.attestationId);
      setStatus('success');

      // Refresh latest attestation
      const att = await getLatestAttestation(cchainProvider, walletAddress);
      setLatestAttestation(att);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Attestation failed';
      // User rejected = not an error worth showing
      if (msg.includes('user rejected') || msg.includes('ACTION_REJECTED')) {
        setStatus('idle');
      } else {
        setError(msg);
        setStatus('error');
      }
    } finally {
      attestingRef.current = false;
    }
  }, [walletAddress, walletProvider, nfts]);

  return {
    attest,
    status,
    txHash,
    attestationId,
    error,
    latestAttestation,
    loadingExisting,
  };
}
