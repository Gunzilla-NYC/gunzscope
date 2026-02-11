import { NextResponse } from 'next/server';

// ─── Shared API response types ───────────────────────────────────────────────
// Use these for all route handlers that follow the { success, ... } pattern.
// Domain-specific routes (OpenSea proxy, metadata proxy) may define their own.

/** Successful response — spread extra fields alongside `success: true` */
export type ApiSuccess<T extends Record<string, unknown> = Record<string, never>> =
  { success: true } & T;

/** Error response */
export interface ApiError {
  success: false;
  error: string;
}

/** Discriminated union — consumers can narrow on `success` */
export type ApiResponse<T extends Record<string, unknown> = Record<string, never>> =
  ApiSuccess<T> | ApiError;

// ─── NextResponse helpers ────────────────────────────────────────────────────

/** Return a typed success response (200 by default) */
export function jsonSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true as const, ...data }, { status });
}

/** Return a typed error response */
export function jsonError(
  error: string,
  status = 500,
): NextResponse<ApiError> {
  return NextResponse.json({ success: false as const, error }, { status });
}
