import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ATTESTATION_ABI } from '@/lib/attestation/contract';

const CCHAIN_RPC = 'https://avalanche-c-chain-rpc.publicnode.com';
const ATTESTATION_CONTRACT = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle');

  if (!handle || !handle.trim()) {
    return NextResponse.json(
      { error: 'handle parameter required' },
      { status: 400 },
    );
  }

  if (!ATTESTATION_CONTRACT) {
    return NextResponse.json(
      { error: 'Contract not configured' },
      { status: 503 },
    );
  }

  try {
    const provider = new ethers.JsonRpcProvider(CCHAIN_RPC);
    const contract = new ethers.Contract(ATTESTATION_CONTRACT, ATTESTATION_ABI, provider);
    const address: string = await contract.resolveHandle(handle.trim());

    if (!address || address === ZERO_ADDRESS) {
      return NextResponse.json(
        { error: 'Handle not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { handle: handle.trim(), address },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err: unknown) {
    console.error('[resolve-handle]', err);
    return NextResponse.json(
      { error: 'Failed to resolve handle' },
      { status: 500 },
    );
  }
}
