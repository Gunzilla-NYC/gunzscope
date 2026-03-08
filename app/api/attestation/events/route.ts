import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ATTESTATION_ABI, getContractAddress, getCChainProvider } from '@/lib/attestation/contract';

/** Historical contract addresses and their deployment blocks on C-Chain */
const CONTRACT_HISTORY = [
  { address: '0x5198a3661654748b2752F351efE361DC6Ef4Cd1D', deployBlock: 79266818 },
  { address: '0xf8f5aa3D940009987F02AD92e44A5434Bab748bf', deployBlock: 79327768 },
  { address: '0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16', deployBlock: 79329579 }, // UUPS proxy (permanent)
];

/** Max block range per queryFilter call (public RPC limit) */
const BLOCK_CHUNK = 49000;

interface AttestationEvent {
  wallet: string;
  attestationId: number;
  merkleRoot: string;
  totalValueGun: string;
  itemCount: number;
  blockNumber: number;
  metadataURI: string;
  txHash: string;
  timestamp: number;
  contractAddress: string;
}

interface CachedResponse {
  events: AttestationEvent[];
  stats: { totalAttestations: number; uniqueWallets: number; totalGunAttested: string };
}

let cache: CachedResponse | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();
  if (cache && now < cacheExpiresAt) {
    return NextResponse.json(cache, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

  try {
    const provider = getCChainProvider();
    const latestBlock = await provider.getBlockNumber();

    // Include the current contract address in case it's not in history yet
    const currentAddress = getContractAddress();
    const allContracts = [...CONTRACT_HISTORY];
    if (!allContracts.some(c => c.address.toLowerCase() === currentAddress.toLowerCase())) {
      allContracts.push({ address: currentAddress, deployBlock: CONTRACT_HISTORY.at(-1)?.deployBlock ?? 79266818 });
    }

    // Query events from all contract addresses
    const allLogs: (ethers.EventLog & { _contractAddress: string })[] = [];

    for (const { address, deployBlock } of allContracts) {
      const contract = new ethers.Contract(address, ATTESTATION_ABI, provider);
      const filter = contract.filters.PortfolioAttested();

      for (let from = deployBlock; from <= latestBlock; from += BLOCK_CHUNK) {
        const to = Math.min(from + BLOCK_CHUNK - 1, latestBlock);
        const chunk = await contract.queryFilter(filter, from, to);
        for (const log of chunk) {
          (log as ethers.EventLog & { _contractAddress: string })._contractAddress = address;
          allLogs.push(log as ethers.EventLog & { _contractAddress: string });
        }
      }
    }

    // Collect unique block numbers for timestamp lookup
    const blockNumbers = [...new Set(allLogs.map(l => l.blockNumber))];
    const blockTimestamps = new Map<number, number>();
    await Promise.all(
      blockNumbers.map(async (bn) => {
        const block = await provider.getBlock(bn);
        if (block) blockTimestamps.set(bn, block.timestamp * 1000);
      }),
    );

    // Parse events — use first contract's interface (ABI is the same across versions)
    const iface = new ethers.Interface(ATTESTATION_ABI);
    const events: AttestationEvent[] = [];
    let totalGunWei = BigInt(0);
    const walletSet = new Set<string>();

    for (const log of allLogs) {
      const parsed = iface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (!parsed) continue;

      const wallet = parsed.args.wallet as string;
      const totalValueGun = parsed.args.totalValueGun as bigint;
      walletSet.add(wallet.toLowerCase());
      totalGunWei += totalValueGun;

      events.push({
        wallet,
        attestationId: Number(parsed.args.attestationId),
        merkleRoot: parsed.args.merkleRoot as string,
        totalValueGun: ethers.formatEther(totalValueGun),
        itemCount: Number(parsed.args.itemCount),
        blockNumber: log.blockNumber,
        metadataURI: parsed.args.metadataURI as string,
        txHash: log.transactionHash,
        timestamp: blockTimestamps.get(log.blockNumber) ?? 0,
        contractAddress: log._contractAddress,
      });
    }

    // Sort newest first
    events.sort((a, b) => b.blockNumber - a.blockNumber);

    const result: CachedResponse = {
      events,
      stats: {
        totalAttestations: events.length,
        uniqueWallets: walletSet.size,
        totalGunAttested: ethers.formatEther(totalGunWei),
      },
    };

    cache = result;
    cacheExpiresAt = now + CACHE_TTL;

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err: unknown) {
    console.error('[attestation/events]', err);

    // Serve stale cache on error
    if (cache) {
      return NextResponse.json(cache, {
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      });
    }

    return NextResponse.json({ error: 'Failed to fetch attestation events' }, { status: 500 });
  }
}
