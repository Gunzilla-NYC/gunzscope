import { NextRequest } from 'next/server';
import { checkSlugAvailability } from '@/lib/services/referralService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * GET /api/referral/check-slug?slug={slug} — Check slug availability
 *
 * No auth required — lightweight public check.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug || typeof slug !== 'string') {
    return jsonError('slug query param required', 400);
  }

  try {
    const result = await checkSlugAvailability(slug);
    return jsonSuccess({ available: result.available, reason: result.reason });
  } catch {
    return jsonError('Failed to check slug', 500);
  }
}
