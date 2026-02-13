import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/rpc — Server-side JSON-RPC proxy for GunzChain.
 *
 * The browser can't call the RPC directly because:
 *   1. The DO proxy is HTTP — mixed content blocked from HTTPS pages
 *   2. The public RPC may lack CORS headers
 *
 * This route forwards JSON-RPC payloads server-side where neither
 * restriction applies, then returns the result to the browser.
 */

const RPC_URL =
  process.env.AVALANCHE_RPC_URL ||
  'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rpcResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!rpcResponse.ok) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: body.id ?? null, error: { code: -32603, message: `RPC returned ${rpcResponse.status}` } },
        { status: 502 }
      );
    }

    const data = await rpcResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'RPC proxy error' } },
      { status: 502 }
    );
  }
}
