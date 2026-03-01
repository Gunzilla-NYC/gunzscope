import { NextRequest, NextResponse } from 'next/server';

const AUTONOMYS_GATEWAY = 'https://gateway.autonomys.xyz/file';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cid: string }> },
) {
  const { cid } = await params;

  if (!cid || cid.length < 10) {
    return NextResponse.json({ error: 'Invalid CID' }, { status: 400 });
  }

  try {
    const res = await fetch(`${AUTONOMYS_GATEWAY}/${cid}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 }, // Cache 24h — attestation data is immutable
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Metadata not found' },
        { status: res.status },
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 502 },
    );
  }
}
