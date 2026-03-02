/**
 * Contract interaction layer for PortfolioAttestation.
 *
 * Handles reading/writing attestations on Avalanche C-Chain via ethers.js v6.
 */

import { ethers, type Signer } from 'ethers';

/** Avalanche C-Chain RPC for read-only contract calls */
const CCHAIN_RPC = 'https://avalanche-c-chain-rpc.publicnode.com';
export const AVALANCHE_CHAIN_ID = 43114;
export const AVALANCHE_CHAIN_ID_HEX = '0xA86A';

// ABI — only the functions we call (keeps bundle small)
export const ATTESTATION_ABI = [
  'function attest(address wallet, uint256 blockNumber, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, string metadataURI) external payable returns (uint256)',
  'function attestFee() external view returns (uint256)',
  'function getAttestationCount(address wallet) external view returns (uint256)',
  'function getAttestation(address wallet, uint256 index) external view returns (tuple(uint256 blockNumber, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, uint48 timestamp, string metadataURI))',
  'function getLatestAttestation(address wallet) external view returns (tuple(uint256 blockNumber, bytes32 merkleRoot, uint256 totalValueGun, uint16 itemCount, uint48 timestamp, string metadataURI))',
  'function verifyHolding(address wallet, uint256 attestationIndex, bytes32 leaf, bytes32[] proof) external view returns (bool)',
  'function totalAttestations() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function withdraw() external',
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

export function getContractAddress(): string {
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
    wallet: string; // The wallet whose portfolio is being attested
    blockNumber: number;
    merkleRoot: string;
    totalValueGun: string; // 18-decimal wei string
    itemCount: number;
    metadataURI: string;
  },
): Promise<{ txHash: string; attestationId: number }> {
  const contract = getWriteContract(signer);

  // Read the current fee from the contract
  const fee: bigint = await contract.attestFee();

  const tx = await contract.attest(
    params.wallet,
    params.blockNumber,
    params.merkleRoot,
    params.totalValueGun,
    params.itemCount,
    params.metadataURI,
    { value: fee },
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
 * Get the current attestation fee (in wei).
 */
export async function getAttestFee(
  provider: ethers.Provider,
): Promise<bigint> {
  const contract = getReadContract(provider);
  return contract.attestFee();
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
 * Withdraw all collected AVAX fees from the attestation contract to the owner.
 * Must be called by the contract owner.
 */
export async function withdrawFees(
  signer: Signer,
): Promise<{ txHash: string }> {
  const contract = getWriteContract(signer);
  const tx = await contract.withdraw();
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Get the contract owner address.
 */
export async function getContractOwner(
  provider: ethers.Provider,
): Promise<string> {
  const contract = getReadContract(provider);
  return contract.owner();
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

/**
 * Get a read-only provider for Avalanche C-Chain.
 */
export function getCChainProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(CCHAIN_RPC);
}

/**
 * Ensure the user's wallet is on Avalanche C-Chain.
 * Attempts to switch; if chain not added, adds it first.
 */
export async function ensureAvalancheChain(walletProvider: unknown): Promise<void> {
  const provider = walletProvider as ethers.Eip1193Provider;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AVALANCHE_CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    // Error code 4902 = chain not added
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: AVALANCHE_CHAIN_ID_HEX,
          chainName: 'Avalanche C-Chain',
          nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
          rpcUrls: [CCHAIN_RPC],
          blockExplorerUrls: ['https://snowtrace.io'],
        }],
      });
    } else {
      throw err;
    }
  }
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
