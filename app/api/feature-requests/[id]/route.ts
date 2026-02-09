/**
 * PATCH /api/feature-requests/[id] - Update status (admin only)
 * DELETE /api/feature-requests/[id] - Delete request (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse, isAdminWallet } from '@/lib/auth/dynamicAuth';
import { updateStatus, deleteRequest } from '@/lib/services/featureRequestService';

const VALID_STATUSES = ['open', 'planned', 'completed', 'declined'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  if (!isAdminWallet(authResult.user.walletAddress)) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminNote } = body;

    if (!status || !VALID_STATUSES.includes(status as ValidStatus)) {
      return NextResponse.json(
        { success: false, error: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // When reopening, clear the admin note
    const note = status === 'open' ? null : adminNote;
    await updateStatus(id, status as ValidStatus, note);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating feature request status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  if (!isAdminWallet(authResult.user.walletAddress)) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    await deleteRequest(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feature request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}
