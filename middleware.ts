/**
 * Next.js Middleware — Server-Side Whitelist Enforcement
 *
 * Runs on Edge Runtime. For every protected API route:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify JWT via Dynamic Labs JWKS (jose library)
 * 3. Extract wallet address from verified_credentials
 * 4. Query whitelist_entries via Neon serverless HTTP
 * 5. Block with 401/403 if invalid or not whitelisted
 *
 * No token → pass through (route handler decides if auth is required).
 *
 * Page routes are protected via gs_session cookie (set by /api/access/validate).
 * Whitelist removal (soft delete) takes effect on next page navigation —
 * middleware re-validates against the DB on every page route request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { checkWhitelistEdge } from '@/lib/services/whitelistService.edge';

// ---------------------------------------------------------------------------
// JWKS — cached internally by jose across invocations
// ---------------------------------------------------------------------------

const environmentId =
  process.env.DYNAMIC_ENVIRONMENT_ID ||
  process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

const JWKS = environmentId
  ? createRemoteJWKSet(
      new URL(
        `https://app.dynamic.xyz/api/v0/sdk/${environmentId}/.well-known/jwks`
      )
    )
  : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

interface VerifiedCredential {
  address?: string;
  email?: string;
  chain?: string;
  format?: string;
}

function extractIdentifier(payload: JWTPayload): string | null {
  const creds = payload.verified_credentials as
    | VerifiedCredential[]
    | undefined;

  if (creds && Array.isArray(creds)) {
    // Prefer wallet address
    const walletCred = creds.find(
      (c) => c.format === 'blockchain' || c.address
    );
    if (walletCred?.address) return walletCred.address.toLowerCase();

    // Fall back to email
    const emailCred = creds.find((c) => c.email);
    if (emailCred?.email) return `email:${emailCred.email.toLowerCase()}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const isPageRoute = !request.nextUrl.pathname.startsWith('/api/');

  // -----------------------------------------------------------------------
  // Page routes — cookie-based whitelist check (gs_session)
  // -----------------------------------------------------------------------
  if (isPageRoute) {
    const sessionToken = request.cookies.get('gs_session')?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      // SESSION_SECRET not configured — fail open (let page load)
      return NextResponse.next();
    }

    try {
      const secret = new TextEncoder().encode(sessionSecret);
      const { payload } = await jwtVerify(sessionToken, secret);
      const wallet = payload.wallet as string;
      if (!wallet || !(await checkWhitelistEdge(wallet))) {
        return NextResponse.redirect(new URL('/waitlist', request.url));
      }
      return NextResponse.next();
    } catch {
      // Invalid or expired cookie — redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // -----------------------------------------------------------------------
  // API routes — Bearer token whitelist check (existing logic)
  // -----------------------------------------------------------------------

  // No JWKS = no Dynamic environment configured → pass through
  if (!JWKS) return NextResponse.next();

  // Extract bearer token
  const authHeader = request.headers.get('Authorization');
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // No token → let the route handler decide (returns 401 MISSING_TOKEN
  // for required-auth routes, works anonymously for optional-auth routes)
  if (!token) return NextResponse.next();

  try {
    // Verify JWT signature + expiry
    const { payload } = await jwtVerify(token, JWKS);

    // Check for additional auth requirements (MFA)
    if (
      payload.scopes &&
      Array.isArray(payload.scopes) &&
      payload.scopes.includes('requiresAdditionalAuth')
    ) {
      return jsonError('Additional authentication required', 401);
    }

    // Extract wallet or email identifier
    const identifier = extractIdentifier(payload);
    if (!identifier) {
      return jsonError('No wallet address in token', 401);
    }

    // Whitelist check — the core enforcement (single source of truth)
    const whitelisted = await checkWhitelistEdge(identifier);
    if (!whitelisted) {
      return jsonError('Not whitelisted', 403);
    }

    // Whitelisted — allow request
    return NextResponse.next();
  } catch {
    // Invalid or expired JWT
    return jsonError('Invalid or expired token', 401);
  }
}

// ---------------------------------------------------------------------------
// Route matcher — only run middleware on protected routes
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    // Page routes (cookie-based whitelist check)
    '/portfolio',
    '/account',
    '/feature-requests',
    '/leaderboard',
    '/scarcity',
    '/market',
    '/explore',

    // User profile
    '/api/me',
    '/api/me/:path*',

    // Favorites & wishlist
    '/api/favorites',
    '/api/favorites/:path*',

    // Tracked addresses
    '/api/tracked-addresses',
    '/api/tracked-addresses/:path*',

    // Portfolio addresses
    '/api/portfolio-addresses',
    '/api/portfolio-addresses/:path*',

    // Portfolio cache & snapshot (NOT /api/portfolio/[walletAddress] — that's public)
    '/api/portfolio/cache',
    '/api/portfolio/cache/:path*',
    '/api/portfolio/snapshot',
    '/api/portfolio/snapshot/:path*',

    // Settings
    '/api/settings',
    '/api/settings/:path*',

    // Alerts
    '/api/alerts',
    '/api/alerts/:path*',

    // Share links
    '/api/share',
    '/api/share/:path*',
    '/api/shares',
    '/api/shares/:path*',

    // Referral system
    '/api/referral',
    '/api/referral/:path*',

    // Feature requests
    '/api/feature-requests',
    '/api/feature-requests/:path*',

    // Attestations
    '/api/attestation',
    '/api/attestation/:path*',
  ],
};
