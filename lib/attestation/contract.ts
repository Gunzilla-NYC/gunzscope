/**
 * Contract interaction layer for PortfolioAttestation.
 *
 * Handles reading/writing attestations on GunzChain via ethers.js v6.
 */

import { ethers, type BrowserProvider, type Signer } from 'ethers';

// ABI — only the functions we call (keeps bundle small)
const ATTESTATION_ABI = [
  'function attest(uint256 blockNumber, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, string metadataURI) external returns (uint256)',
  'function getAttestationCount(address wallet) external view returns (uint256)',
  'function getAttestation(address wallet, uint256 index) external view returns (tuple(uint256 blockNumber, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, uint48 timestamp, string metadataURI))',
  'function getLatestAttestation(address wallet) external view returns (tuple(uint256 blockNumber, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, uint48 timestamp, string metadataURI))',
  'function verifyHolding(address wallet, uint256 attestationIndex, bytes32 leaf, bytes32[] proof) external view returns (bool)',
  'function totalAttestations() external view returns (uint256)',
  'event PortfolioAttested(address indexed wallet, uint256 indexed attestationId, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, uint256 blockNumber, string metadataURI)',
] as const;

export interface OnChainAttestation {
  blockNumber: bigint;
  merkleRoot: string;
  totalValueGun: bigint;
  itemCount: number;
  timestamp: number;
  metadataURI: string;
}

function getContractAddress(): string {
  const address = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT;
  if (!address) throw new Error('NEXT_PUBLIC_ATTESTATION_CONTRACT not set');
  return address;
}

function getReadContract(provider: ethers.Provider) {
  return new ethers.Contract(getContractAddress(), ATTESTATION_ABI, provider);
}

function getWriteContract(signer: Signer) {
  return new ethers.Contract(getContractAddress(), ATTESTATION_ABI, signer);
}

/**
 * Submit a portfolio attestation on-chain.
 * Returns the transaction hash and attestation ID.
 */
export async function submitAttestation(
  signer: Signer,
  params: {
    blockNumber: number;
    merkleRoot: string;
    totalValueGun: string; // 18-decimal wei string
    itemCount: number;
    metadataURI: string;
  },
): Promise<{ txHash: string; attestationId: number }> {
  const contract = getWriteContract(signer);

  const tx = await contract.attest(
    params.blockNumber,
    params.merkleRoot,
    params.totalValueGun,
    params.itemCount,
    params.metadataURI,
  );

  const receipt = await tx.wait();

  // Extract attestationId from the PortfolioAttested event
  const event = receipt.logs
    .map((log: ethers.Log) => {
      try {
        return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      } catch {
        return null;
      }
    })
    .find((e: ethers.LogDescription | null) => e?.name === 'PortfolioAttested');

  const attestationId = event ? Number(event.args.attestationId) : 0;

  return { txHash: receipt.hash, attestationId };
}

/**
 * Get the number of attestations for a wallet.
 */
export async function getAttestationCount(
  provider: ethers.Provider,
  wallet: string,
): Promise<number> {
  const contract = getReadContract(provider);
  const count = await contract.getAttestationCount(wallet);
  return Number(count);
}

/**
 * Get a specific attestation by index.
 */
export async function getAttestation(
  provider: ethers.Provider,
  wallet: string,
  index: number,
): Promise<OnChainAttestation> {
  const contract = getReadContract(provider);
  const att = await contract.getAttestation(wallet, index);
  return parseAttestation(att);
}

/**
 * Get the most recent attestation for a wallet.
 */
export async function getLatestAttestation(
  provider: ethers.Provider,
  wallet: string,
): Promise<OnChainAttestation | null> {
  const contract = getReadContract(provider);
  try {
    const att = await contract.getLatestAttestation(wallet);
    return parseAttestation(att);
  } catch {
    return null; // No attestations yet
  }
}

/**
 * Verify a specific holding was included in an attestation.
 */
export async function verifyHolding(
  provider: ethers.Provider,
  wallet: string,
  attestationIndex: number,
  leaf: string,
  proof: string[],
): Promise<boolean> {
  const contract = getReadContract(provider);
  return contract.verifyHolding(wallet, attestationIndex, leaf, proof);
}

/**
 * Get the global attestation counter.
 */
export async function getTotalAttestations(
  provider: ethers.Provider,
): Promise<number> {
  const contract = getReadContract(provider);
  const total = await contract.totalAttestations();
  return Number(total);
}

/**
 * Get an ethers Signer from a Dynamic Labs wallet provider.
 */
export async function getSignerFromProvider(
  walletProvider: unknown,
): Promise<Signer> {
  const provider = new ethers.BrowserProvider(walletProvider as ethers.Eip1193Provider);
  return provider.getSigner();
}

function parseAttestation(raw: unknown[]): OnChainAttestation {
  return {
    blockNumber: raw[0] as bigint,
    merkleRoot: raw[1] as string,
    totalValueGun: raw[2] as bigint,
    itemCount: Number(raw[3]),
    timestamp: Number(raw[4]) * 1000, // Convert seconds → milliseconds
    metadataURI: raw[5] as string,
  };
}
