import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ATTESTATION_ABI, getContractAddress, getCChainProvider } from '@/lib/attestation/contract';

/** UUPS proxy deploy block — the only contract that matters */
const PROXY_DEPLOY_BLOCK = 79329579;

/** Max block range per queryFilter call (public RPC limit) */
const BLOCK_CHUNK = 100_000;

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
    const contractAddress = getContractAddress();
    const contract = new ethers.Contract(contractAddress, ATTESTATION_ABI, provider);
    const filter = contract.filters.PortfolioAttested();

    // Query events in chunks (sequential to avoid RPC rate limits)
    const allLogs: (ethers.EventLog & { _contractAddress: string })[] = [];

    for (let from = PROXY_DEPLOY_BLOCK; from <= latestBlock; from += BLOCK_CHUNK) {
      const to = Math.min(from + BLOCK_CHUNK - 1, latestBlock);
      try {
        const chunk = await contract.queryFilter(filter, from, to);
        for (const log of chunk) {
          (log as ethers.EventLog & { _contractAddress: string })._contractAddress = contractAddress;
          allLogs.push(log as ethers.EventLog & { _contractAddress: string });
        }
      } catch (chunkErr) {
        console.warn(`[attestation/events] chunk ${from}-${to} failed, skipping`, chunkErr);
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
