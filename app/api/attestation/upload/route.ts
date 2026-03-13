import { NextRequest, NextResponse } from 'next/server';
import { createAutoDriveApi } from '@autonomys/auto-drive';
import prisma from '@/lib/db';

const METADATA_BASE_URL = 'https://gunzscope.xyz/api/attestation/metadata';

interface AttestationMetadata {
  wallet: string;
  gsHandle?: string;
  merkleRoot: string;
  totalValueGun: string;
  itemCount: number;
  blockNumber: number;
  timestamp: number;
  holdings: { contract: string; tokenId: string; valueWei: string }[];
  wallets?: { address: string; status: string }[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.AUTO_DRIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Auto Drive not configured' },
      { status: 503 },
    );
  }

  let body: AttestationMetadata;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.wallet || !body.merkleRoot || !body.holdings) {
    return NextResponse.json(
      { error: 'Missing required fields: wallet, merkleRoot, holdings' },
      { status: 400 },
    );
  }

  try {
    const api = createAutoDriveApi({
      apiKey,
      apiUrl: 'https://mainnet.auto-drive.autonomys.xyz/api',
    });

    // Look up display name from DB (best-effort, falls back to truncated address)
    let label = body.wallet.slice(2, 10);
    try {
      const wallet = await prisma.wallet.findFirst({
        where: { address: body.wallet.toLowerCase() },
        select: { userProfile: { select: { displayName: true } } },
      });
      if (wallet?.userProfile?.displayName) {
        label = wallet.userProfile.displayName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
      }
    } catch {
      // DB lookup failed — use address fallback
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `gunzscope-${label}-${body.itemCount}nfts-${date}.json`;
    const cid = await api.uploadObjectAsJSON(body, filename, { compression: true });

    return NextResponse.json({
      cid: cid.toString(),
      url: `${METADATA_BASE_URL}/${cid}`,
    });
  } catch (err: unknown) {
    console.error('[attestation/upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
