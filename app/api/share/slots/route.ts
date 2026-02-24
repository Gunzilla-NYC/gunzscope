import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getShareSlots } from '@/lib/services/shareService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

const WALLET_RE = /^0x[0-9a-f]{40}$/i;

/**
 * GET /api/share/slots?address={addr} — Get 3 share slots for a wallet
 * Auth required. Returns array of { method, active, code, viewCount, createdAt }.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const address = request.nextUrl.searchParams.get('address');
  if (!address || !WALLET_RE.test(address)) {
    return jsonError('Valid wallet address required', 400);
  }

  try {
    const slots = await getShareSlots(address);
    return jsonSuccess({ slots });
  } catch (err) {
    console.error('[Share] GET /slots error:', err);
    return jsonError('Failed to get share slots', 500);
  }
}
