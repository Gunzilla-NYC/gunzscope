/**
 * Wallet Sync — compute delta between DB portfolio and on-chain state.
 *
 * Used during attestation to batch-sync wallets on-chain before attesting.
 * The primary wallet (signer) is never included — it's implied on-chain.
 */

import type { OnChainPortfolioWallet } from '@/lib/attestation/contract';
import { OnChainWalletStatus } from '@/lib/attestation/contract';
import type { WalletClaimStatus } from '@/lib/hooks/useUserProfile';

export interface WalletSyncAction {
  type: 'add' | 'remove' | 'upgrade';
  address: string;
  status?: OnChainWalletStatus;
}

/**
 * Map DB claim status to on-chain wallet status.
 * PRIMARY wallets are skipped (they're the signer, implied on-chain).
 */
function mapStatus(dbStatus: WalletClaimStatus): OnChainWalletStatus | null {
  switch (dbStatus) {
    case 'VERIFIED': return OnChainWalletStatus.VERIFIED;
    case 'SELF_REPORTED': return OnChainWalletStatus.SELF_REPORTED;
    case 'PRIMARY': return null; // Skip — primary is implicit
    default: return null;
  }
}

/**
 * Compute the set of on-chain wallet sync actions needed to align
 * the on-chain state with the DB state.
 *
 * @param dbWallets - Portfolio wallets from the database (includes status)
 * @param onChainWallets - Portfolio wallets currently on-chain
 * @param primaryAddress - The primary wallet address (signer) — excluded from sync
 */
export function computeWalletSyncActions(
  dbWallets: { address: string; status: WalletClaimStatus }[],
  onChainWallets: OnChainPortfolioWallet[],
  primaryAddress: string,
): WalletSyncAction[] {
  const actions: WalletSyncAction[] = [];
  const primaryLower = primaryAddress.toLowerCase();

  // Build lookup maps
  const onChainMap = new Map<string, OnChainPortfolioWallet>();
  for (const w of onChainWallets) {
    onChainMap.set(w.addr.toLowerCase(), w);
  }

  const dbMap = new Map<string, WalletClaimStatus>();
  for (const w of dbWallets) {
    if (w.address.toLowerCase() === primaryLower) continue; // Skip primary
    const status = mapStatus(w.status);
    if (status !== null) {
      dbMap.set(w.address.toLowerCase(), w.status);
    }
  }

  // DB wallet not on-chain → add
  for (const [addrLower, dbStatus] of dbMap) {
    const onChain = onChainMap.get(addrLower);
    const targetStatus = mapStatus(dbStatus);
    if (targetStatus === null) continue;

    if (!onChain) {
      actions.push({ type: 'add', address: addrLower, status: targetStatus });
    } else if (
      dbStatus === 'VERIFIED' &&
      onChain.status === OnChainWalletStatus.SELF_REPORTED
    ) {
      // Upgrade: on-chain is SELF_REPORTED but DB says VERIFIED
      actions.push({ type: 'upgrade', address: addrLower, status: OnChainWalletStatus.VERIFIED });
    }
  }

  // On-chain wallet not in DB → remove
  for (const [addrLower] of onChainMap) {
    if (addrLower === primaryLower) continue;
    if (!dbMap.has(addrLower)) {
      actions.push({ type: 'remove', address: addrLower });
    }
  }

  return actions;
}
