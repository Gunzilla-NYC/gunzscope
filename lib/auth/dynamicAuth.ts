/**
 * Dynamic JWT Verification for Server-Side Authentication
 *
 * This module verifies JWTs issued by Dynamic and extracts user identity.
 * Used in API routes to authenticate requests from connected wallets.
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { NextRequest } from 'next/server';

// =============================================================================
// Types
// =============================================================================

export interface DynamicUser {
  /** Dynamic's unique user ID */
  userId: string;
  /** Connected wallet address (if available) */
  walletAddress?: string;
  /** Wallet chain */
  chain?: string;
  /** Email if provided during Dynamic auth */
  email?: string;
  /** Raw JWT claims for debugging */
  claims: JwtPayload;
}

export interface AuthResult {
  success: true;
  user: DynamicUser;
}

export interface AuthError {
  success: false;
  error: string;
  code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'VERIFICATION_FAILED' | 'CONFIG_ERROR';
}

export type AuthOutcome = AuthResult | AuthError;

// =============================================================================
// JWKS Client Setup
// =============================================================================

// Server-side uses DYNAMIC_ENVIRONMENT_ID; client-side DynamicProvider uses NEXT_PUBLIC_ version
const environmentId = process.env.DYNAMIC_ENVIRONMENT_ID || process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient | null {
  if (!environmentId) {
    console.error('DYNAMIC_ENVIRONMENT_ID is not configured');
    return null;
  }

  if (!jwksClient) {
    const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${environmentId}/.well-known/jwks`;
    jwksClient = new JwksClient({
      jwksUri: jwksUrl,
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  return jwksClient;
}

// =============================================================================
// JWT Verification
// =============================================================================

/**
 * Verify a Dynamic JWT token and extract user information
 */
export async function verifyDynamicToken(token: string): Promise<AuthOutcome> {
  const client = getJwksClient();
  if (!client) {
    return {
      success: false,
      error: 'Dynamic environment ID not configured',
      code: 'CONFIG_ERROR',
    };
  }

  try {
    // Get the signing key from Dynamic's JWKS endpoint
    const signingKey = await client.getSigningKey();
    const publicKey = signingKey.getPublicKey();

    // Verify the JWT
    const decoded = jwt.verify(token, publicKey, {
      ignoreExpiration: false,
    }) as JwtPayload;

    // Check if additional auth is required (e.g., MFA)
    if (decoded.scopes && Array.isArray(decoded.scopes) && decoded.scopes.includes('requiresAdditionalAuth')) {
      return {
        success: false,
        error: 'Additional authentication required',
        code: 'VERIFICATION_FAILED',
      };
    }

    // Extract user information from claims
    // Dynamic JWT typically contains: sub (user ID), verified_credentials, etc.
    const userId = decoded.sub;
    if (!userId) {
      return {
        success: false,
        error: 'Token missing user ID',
        code: 'INVALID_TOKEN',
      };
    }

    // Extract wallet info from verified_credentials if available
    let walletAddress: string | undefined;
    let chain: string | undefined;
    let email: string | undefined;

    // Dynamic includes verified_credentials array with wallet info
    const verifiedCredentials = decoded.verified_credentials as Array<{
      address?: string;
      chain?: string;
      email?: string;
      format?: string;
    }> | undefined;

    if (verifiedCredentials && Array.isArray(verifiedCredentials)) {
      // Find the first wallet credential
      const walletCred = verifiedCredentials.find(
        (cred) => cred.format === 'blockchain' || cred.address
      );
      if (walletCred) {
        walletAddress = walletCred.address?.toLowerCase();
        chain = walletCred.chain;
      }

      // Find email if available
      const emailCred = verifiedCredentials.find((cred) => cred.email);
      if (emailCred) {
        email = emailCred.email;
      }
    }

    return {
      success: true,
      user: {
        userId,
        walletAddress,
        chain,
        email,
        claims: decoded,
      },
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token has expired',
        code: 'EXPIRED_TOKEN',
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: `Invalid token: ${error.message}`,
        code: 'INVALID_TOKEN',
      };
    }
    console.error('JWT verification error:', error);
    return {
      success: false,
      error: 'Token verification failed',
      code: 'VERIFICATION_FAILED',
    };
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate a request using Dynamic JWT
 * Convenience function for API routes
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthOutcome> {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      success: false,
      error: 'Missing authorization token',
      code: 'MISSING_TOKEN',
    };
  }

  return verifyDynamicToken(token);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(error: AuthError): Response {
  return Response.json(
    { error: error.error, code: error.code },
    { status: 401 }
  );
}
