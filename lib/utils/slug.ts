/**
 * Slug validation helpers.
 * Shared by useReferral, useShareReferral, and referralService.
 */

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
export const CONSECUTIVE_HYPHENS = /--/;

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

export interface SlugValidation {
  status: SlugStatus;
  message?: string;
}

/**
 * Client-side slug validation (synchronous).
 * Returns a validation error if the slug is locally invalid,
 * or null if it passes and needs an API availability check.
 */
export function validateSlugLocally(slug: string): SlugValidation | null {
  if (slug.length < 3) return { status: 'invalid', message: '3\u201320 chars, lowercase + hyphens' };
  if (slug.length > 20) return { status: 'invalid', message: 'Max 20 characters' };
  if (CONSECUTIVE_HYPHENS.test(slug)) return { status: 'invalid', message: 'No consecutive hyphens' };
  if (!SLUG_REGEX.test(slug)) return { status: 'invalid', message: '3\u201320 chars, lowercase + hyphens' };
  return null; // Pass — needs API check
}
