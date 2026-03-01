import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ATTESTATION_ABI, getContractAddress, getCChainProvider } from '@/lib/attestation/contract';

/** Block at which PortfolioAttestation was deployed on C-Chain */
const DEPLOYMENT_BLOCK = 79266818;
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
    const contract = new ethers.Contract(getContractAddress(), ATTESTATION_ABI, provider);

    // Query PortfolioAttested events in chunks (public RPC has 50k block limit)
    const filter = contract.filters.PortfolioAttested();
    const latestBlock = await provider.getBlockNumber();
    const logs: ethers.EventLog[] = [];

    for (let from = DEPLOYMENT_BLOCK; from <= latestBlock; from += BLOCK_CHUNK) {
      const to = Math.min(from + BLOCK_CHUNK - 1, latestBlock);
      const chunk = await contract.queryFilter(filter, from, to);
      logs.push(...(chunk as ethers.EventLog[]));
    }

    // Collect unique block numbers for timestamp lookup
    const blockNumbers = [...new Set(logs.map(l => l.blockNumber))];
    const blockTimestamps = new Map<number, number>();
    await Promise.all(
      blockNumbers.map(async (bn) => {
        const block = await provider.getBlock(bn);
        if (block) blockTimestamps.set(bn, block.timestamp * 1000);
      }),
    );

    // Parse events
    const events: AttestationEvent[] = [];
    let totalGunWei = BigInt(0);
    const walletSet = new Set<string>();

    for (const log of logs) {
      const parsed = contract.interface.parseLog({
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
    const msg = err instanceof Error ? err.message : 'Failed to fetch events';

    // Serve stale cache on error
    if (cache) {
      return NextResponse.json(cache, {
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
