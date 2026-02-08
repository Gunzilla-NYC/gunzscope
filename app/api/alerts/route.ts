import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import {
  getPreferences,
  upsertPreference,
  getRecentAlerts,
  type AlertType,
} from '@/lib/services/alertPreferenceService';

const VALID_TYPES: AlertType[] = [
  'gun_price',
  'portfolio_digest',
  'floor_drop',
  'whale_tracker',
  'collection_drop',
  'snipe_alert',
];

/**
 * GET /api/alerts — Get all alert preferences + recent alert history
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const profile = await getProfileByDynamicId(auth.user.userId);
  if (!profile) {
    return Response.json({ success: false, error: 'Profile not found' }, { status: 404 });
  }

  const [preferences, recentAlerts] = await Promise.all([
    getPreferences(profile.id),
    getRecentAlerts(profile.id),
  ]);

  return Response.json({ success: true, preferences, recentAlerts });
}

/**
 * PUT /api/alerts — Upsert an alert preference
 * Body: { type: AlertType, enabled: boolean, config: object }
 */
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const profile = await getProfileByDynamicId(auth.user.userId);
  if (!profile) {
    return Response.json({ success: false, error: 'Profile not found' }, { status: 404 });
  }

  // Require email to enable alerts
  if (!profile.email) {
    return Response.json(
      { success: false, error: 'Email required to enable alerts. Set your email in Account settings.' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { type, enabled, config } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return Response.json(
      { success: false, error: `Invalid alert type. Valid types: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const preference = await upsertPreference(
    profile.id,
    type as AlertType,
    enabled !== false,
    config || {}
  );

  return Response.json({ success: true, preference });
}
