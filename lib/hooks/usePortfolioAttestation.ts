'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NFT } from '@/lib/types';
import { buildPortfolioTree, computeTotalValueWei, nftsToLeaves } from '@/lib/attestation/merkleTree';
import {
  submitAttestation,
  getLatestAttestation,
  getCChainProvider,
  getSignerFromProvider,
  ensureAvalancheChain,
  getPortfolioWalletsOnChain,
  batchAddWalletsOnChain,
  batchRemoveWalletsOnChain,
  type OnChainAttestation,
} from '@/lib/attestation/contract';
import { computeWalletSyncActions } from '@/lib/attestation/walletSync';
import type { WalletClaimStatus } from '@/lib/hooks/useUserProfile';

export type AttestationStatus =
  | 'idle'
  | 'building'
  | 'switching-chain'
  | 'syncing-wallets'
  | 'uploading'
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
  /** Warnings from wallet sync (e.g. skipped wallets claimed by others) */
  syncWarnings: string[];
}

export interface DbPortfolioWallet {
  address: string;
  status: WalletClaimStatus;
}

/**
 * Orchestrates the portfolio attestation flow:
 *   build Merkle tree → switch chain → sign tx → confirm → done
 */
export function usePortfolioAttestation(
  walletAddress: string | undefined,
  nfts: NFT[],
  walletProvider: unknown,
  gsHandle?: string | null,
  portfolioAddresses?: string[],
  dbPortfolioWallets?: DbPortfolioWallet[],
): UsePortfolioAttestationResult {
  const [status, setStatus] = useState<AttestationStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [attestationId, setAttestationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestAttestation, setLatestAttestation] = useState<OnChainAttestation | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);

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
      const leaves = nftsToLeaves(nfts);

      // Step 2: Switch to Avalanche C-Chain if needed
      setStatus('switching-chain');
      await ensureAvalancheChain(walletProvider);

      // Step 3: Get signer and block number from the SAME provider (avoids RPC mismatch)
      setStatus('signing');
      const signer = await getSignerFromProvider(walletProvider);
      const blockNumber = await signer.provider!.getBlockNumber();

      // Step 4: Sync wallets on-chain (if DB portfolio wallets provided)
      setSyncWarnings([]);
      if (dbPortfolioWallets && dbPortfolioWallets.length > 0 && walletAddress) {
        setStatus('syncing-wallets');
        const onChainWallets = await getPortfolioWalletsOnChain(getCChainProvider(), walletAddress);
        const actions = computeWalletSyncActions(dbPortfolioWallets, onChainWallets, walletAddress);

        if (actions.length > 0) {
          const toAdd = actions.filter((a) => a.type === 'add' || a.type === 'upgrade');
          const toRemove = actions.filter((a) => a.type === 'remove');
          const warnings: string[] = [];

          // Batch add/upgrade wallets
          if (toAdd.length > 0) {
            try {
              await batchAddWalletsOnChain(
                signer,
                toAdd.map((a) => a.address),
                toAdd.map((a) => a.status!),
              );
            } catch (addErr: unknown) {
              const msg = addErr instanceof Error ? addErr.message : '';
              if (msg.includes('Already claimed') || msg.includes('reverted')) {
                // Some wallets may be claimed by others — skip and warn
                warnings.push('Some wallets could not be synced (claimed by another user)');
              } else {
                throw addErr;
              }
            }
          }

          // Batch remove wallets
          if (toRemove.length > 0) {
            try {
              await batchRemoveWalletsOnChain(
                signer,
                toRemove.map((a) => a.address),
              );
            } catch (removeErr: unknown) {
              const msg = removeErr instanceof Error ? removeErr.message : '';
              warnings.push(`Wallet removal failed: ${msg}`);
            }
          }

          if (warnings.length > 0) setSyncWarnings(warnings);
        }
      }

      // Step 5: Upload metadata
      setStatus('uploading');
      let metadataURI: string;
      try {
        const res = await fetch('/api/attestation/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: walletAddress,
            ...(gsHandle ? { gsHandle } : {}),
            ...(dbPortfolioWallets && dbPortfolioWallets.length > 0
              ? { wallets: dbPortfolioWallets.map((w) => ({ address: w.address, status: w.status })) }
              : portfolioAddresses && portfolioAddresses.length > 1
                ? { wallets: portfolioAddresses.map((a) => ({ address: a, status: 'SELF_REPORTED' })) }
                : {}),
            merkleRoot: root,
            totalValueGun: totalValueWei,
            itemCount: leafCount,
            blockNumber,
            timestamp: Date.now(),
            holdings: leaves.map(([contract, tokenId, valueWei]) => ({
              contract, tokenId, valueWei,
            })),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error ?? 'Failed to upload metadata');
        }
        const { url } = await res.json();
        metadataURI = url;
      } catch (uploadErr) {
        // Fallback to inline data URI if Auto Drive unavailable
        metadataURI = `data:application/json,${encodeURIComponent(JSON.stringify({ wallet: walletAddress, ...(gsHandle ? { gsHandle } : {}), ...(portfolioAddresses && portfolioAddresses.length > 1 ? { wallets: portfolioAddresses } : {}), items: leafCount, block: blockNumber }))}`;
      }

      // Step 6: Submit attestation
      setStatus('confirming');
      const result = await submitAttestation(signer, {
        wallet: walletAddress,
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
      const att = await getLatestAttestation(getCChainProvider(), walletAddress);
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
  }, [walletAddress, walletProvider, nfts, dbPortfolioWallets]);

  return {
    attest,
    status,
    txHash,
    attestationId,
    error,
    latestAttestation,
    loadingExisting,
    syncWarnings,
  };
}
