/**
 * Merkle tree construction for portfolio attestations.
 *
 * Each leaf represents one NFT holding:
 *   keccak256(abi.encode(contractAddress, tokenId, valueGun))
 *
 * Uses OpenZeppelin's StandardMerkleTree for compatibility
 * with the on-chain MerkleProof.verify() call.
 */

import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import type { NFT } from '@/lib/types';

/** Leaf tuple: [contractAddress, tokenId, valueGun (wei string)] */
export type HoldingLeaf = [string, string, string];

/** Leaf encoding types matching the Solidity abi.encode */
const LEAF_ENCODING: string[] = ['address', 'uint256', 'uint256'];

/**
 * Convert an array of NFT holdings into Merkle leaf tuples.
 * For grouped NFTs (quantity > 1), each individual tokenId becomes its own leaf.
 */
export function nftsToLeaves(nfts: NFT[]): HoldingLeaf[] {
  const leaves: HoldingLeaf[] = [];

  for (const nft of nfts) {
    const contract = nft.contractAddress;
    if (!contract) continue;

    const tokenIds = nft.tokenIds ?? [nft.tokenId];
    const perItemGun = nft.purchasePriceGun ?? 0;

    // Convert GUN (float) to wei-like 18-decimal string
    const valueWei = gunToWei(perItemGun);

    for (const tokenId of tokenIds) {
      leaves.push([contract, tokenId, valueWei]);
    }
  }

  return leaves;
}

/**
 * Build a StandardMerkleTree from NFT holdings.
 * Returns the tree (for generating proofs) and the root hash.
 */
export function buildPortfolioTree(nfts: NFT[]) {
  const leaves = nftsToLeaves(nfts);

  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree with zero holdings');
  }

  const tree = StandardMerkleTree.of(leaves, LEAF_ENCODING);

  return {
    tree,
    root: tree.root as `0x${string}`,
    leafCount: leaves.length,
    leaves,
  };
}

/**
 * Generate a proof for a specific holding in the tree.
 */
export function getHoldingProof(
  tree: StandardMerkleTree<HoldingLeaf>,
  contractAddress: string,
  tokenId: string,
  valueWei: string,
): { proof: string[]; leaf: string } {
  const target: HoldingLeaf = [contractAddress, tokenId, valueWei];

  for (const [index, value] of tree.entries()) {
    if (value[0] === target[0] && value[1] === target[1] && value[2] === target[2]) {
      return {
        proof: tree.getProof(index),
        leaf: tree.leafHash(value),
      };
    }
  }

  throw new Error(`Holding not found in tree: ${contractAddress}:${tokenId}`);
}

/**
 * Compute total portfolio value in GUN (18-decimal wei string).
 */
export function computeTotalValueWei(nfts: NFT[]): string {
  let totalGun = 0;
  for (const nft of nfts) {
    const qty = nft.quantity ?? 1;
    const price = nft.purchasePriceGun ?? 0;
    totalGun += price * qty;
  }
  return gunToWei(totalGun);
}

/**
 * Convert a GUN amount (float) to an 18-decimal wei string.
 * Avoids floating-point precision issues by working in fixed-point.
 */
function gunToWei(gun: number): string {
  if (gun === 0) return '0';

  // Split into integer and fractional parts to avoid floating-point errors
  const str = gun.toFixed(18);
  const [intPart, fracPart = ''] = str.split('.');
  const padded = (fracPart + '0'.repeat(18)).slice(0, 18);
  const combined = intPart + padded;

  // Strip leading zeros
  return combined.replace(/^0+/, '') || '0';
}
