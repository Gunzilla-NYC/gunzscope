import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { deletePreference, type AlertType } from '@/lib/services/alertPreferenceService';

/**
 * DELETE /api/alerts/[type] — Delete/disable an alert preference
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const profile = await getProfileByDynamicId(auth.user.userId);
  if (!profile) {
    return Response.json({ success: false, error: 'Profile not found' }, { status: 404 });
  }

  const { type } = await params;
  const deleted = await deletePreference(profile.id, type as AlertType);

  if (!deleted) {
    return Response.json({ success: false, error: 'Alert preference not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
