import { NextRequest } from 'next/server';

/**
 * Verify that a cron request comes from Vercel Cron.
 * Vercel sends CRON_SECRET in the Authorization header.
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[cron/auth] CRON_SECRET not set — skipping auth in development');
      return true;
    }
    console.error('[cron/auth] CRON_SECRET not configured — rejecting request');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export function cronUnauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
