import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ATTESTATION_ABI, getContractAddress, getCChainProvider } from '@/lib/attestation/contract';

/**
 * Contract addresses and the block ranges they were active.
 * Old non-proxy contracts have a tight endBlock so we only scan their active window.
 * The UUPS proxy scans from deploy to latest.
 */
const CONTRACT_HISTORY: { address: string; deployBlock: number; endBlock?: number }[] = [
  { address: '0x5198a3661654748b2752F351efE361DC6Ef4Cd1D', deployBlock: 79266818, endBlock: 79327767 },
  { address: '0xf8f5aa3D940009987F02AD92e44A5434Bab748bf', deployBlock: 79327768, endBlock: 79329578 },
  { address: '0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16', deployBlock: 79329579 }, // UUPS proxy — open-ended
];

/** Max block range per queryFilter call (publicnode.com limit is 50k) */
const BLOCK_CHUNK = 49_000;

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
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — attestations are infrequent

export async function GET() {
  const now = Date.now();
  if (cache && now < cacheExpiresAt) {
    return NextResponse.json(cache, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  }

  try {
    const provider = getCChainProvider();
    const latestBlock = await provider.getBlockNumber();

    // Query events from all contracts — old ones have tight ranges (1 chunk each)
    const allLogs: (ethers.EventLog & { _contractAddress: string })[] = [];

    for (const { address, deployBlock, endBlock } of CONTRACT_HISTORY) {
      const contract = new ethers.Contract(address, ATTESTATION_ABI, provider);
      const filter = contract.filters.PortfolioAttested();
      const scanEnd = endBlock ?? latestBlock;

      for (let from = deployBlock; from <= scanEnd; from += BLOCK_CHUNK) {
        const to = Math.min(from + BLOCK_CHUNK - 1, scanEnd);
        try {
          const chunk = await contract.queryFilter(filter, from, to);
          for (const log of chunk) {
            (log as ethers.EventLog & { _contractAddress: string })._contractAddress = address;
            allLogs.push(log as ethers.EventLog & { _contractAddress: string });
          }
        } catch (chunkErr) {
          console.warn(`[attestation/events] chunk ${from}-${to} on ${address.slice(0, 10)} failed, skipping`, chunkErr);
        }
      }
    }

    // Collect unique block numbers for timestamp lookup (concurrency-limited)
    const blockNumbers = [...new Set(allLogs.map(l => l.blockNumber))];
    const blockTimestamps = new Map<number, number>();
    const TIMESTAMP_CONCURRENCY = 5;
    for (let i = 0; i < blockNumbers.length; i += TIMESTAMP_CONCURRENCY) {
      const batch = blockNumbers.slice(i, i + TIMESTAMP_CONCURRENCY);
      await Promise.all(
        batch.map(async (bn) => {
          const block = await provider.getBlock(bn);
          if (block) blockTimestamps.set(bn, block.timestamp * 1000);
        }),
      );
    }

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
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
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
