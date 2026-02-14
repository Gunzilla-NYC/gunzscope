/**
 * PATCH /api/feature-requests/[id] - Update status (admin only)
 * DELETE /api/feature-requests/[id] - Delete request (admin only)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, isAdminWallet } from '@/lib/auth/dynamicAuth';
import { updateStatus, deleteRequest } from '@/lib/services/featureRequestService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

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
    return jsonError('Admin access required', 403);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminNote, showAttribution } = body;

    if (!status || !VALID_STATUSES.includes(status as ValidStatus)) {
      return jsonError(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    // When reopening, clear the admin note
    const note = status === 'open' ? null : adminNote;
    await updateStatus(id, status as ValidStatus, note, showAttribution);

    return jsonSuccess({});
  } catch (error) {
    console.error('Error updating feature request status:', error);
    return jsonError('Failed to update status');
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
    return jsonError('Admin access required', 403);
  }

  try {
    const { id } = await params;
    await deleteRequest(id);

    return jsonSuccess({});
  } catch (error) {
    console.error('Error deleting feature request:', error);
    return jsonError('Failed to delete request');
  }
}
