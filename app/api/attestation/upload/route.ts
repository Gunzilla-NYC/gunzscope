import { NextRequest, NextResponse } from 'next/server';
import { createAutoDriveApi } from '@autonomys/auto-drive';

const AUTO_DRIVE_GATEWAY = 'https://gateway.autonomys.xyz/file';

interface AttestationMetadata {
  wallet: string;
  merkleRoot: string;
  totalValueGun: string;
  itemCount: number;
  blockNumber: number;
  timestamp: number;
  holdings: { contract: string; tokenId: string; valueWei: string }[];
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

    const filename = `gunzscope-attestation-${body.wallet.slice(0, 8)}-${Date.now()}.json`;
    const cid = await api.uploadObjectAsJSON(body, filename, { compression: true });

    return NextResponse.json({
      cid: cid.toString(),
      url: `${AUTO_DRIVE_GATEWAY}/${cid}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('Auto Drive upload error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
