import { NextRequest, NextResponse } from 'next/server';

function verifyAdmin(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (!auth) return false;
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return token === secret;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * GET /api/admin/revenue — Revenue stats for the Fees & Revenue admin tab
 *
 * TODO: Wire to real on-chain data by reading PortfolioAttestationV2 contract events
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  // TODO: Read real counts from on-chain contract events or a local index table
  const attestationCount = 0;
  const handleChangeCount = 0;
  const attestationFee = 0.01; // AVAX
  const handleChangeFee = 0.005; // AVAX

  const avaxCollected =
    attestationCount * attestationFee + handleChangeCount * handleChangeFee;

  return NextResponse.json({
    attestationCount,
    handleChangeCount,
    avaxCollected,
    attestationFee,
    handleChangeFee,
  });
}
