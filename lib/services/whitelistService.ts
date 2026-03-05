/**
 * SINGLE SOURCE OF TRUTH — all whitelist logic lives here.
 * If you change the schema (expiresAt, isActive, soft deletes, tiers),
 * update this file AND whitelistService.edge.ts (the Edge Runtime twin).
 *
 * Two runtimes consume whitelist checks:
 *   1. Node.js (API routes) — uses Prisma via checkWhitelist / isWhitelisted
 *   2. Edge Runtime (middleware.ts) — uses checkWhitelistEdge from .edge.ts
 *
 * The WHERE predicate for "is this address allowed?" is:
 *   isActive = true AND (expiresAt IS NULL OR expiresAt > NOW())
 * Both runtimes use this exact predicate.
 */

import prisma from '../db';

// Re-export Edge-compatible check so callers CAN import from one place
// (but middleware.ts should import from .edge.ts directly to avoid
// pulling Prisma into the Edge bundle).
export { checkWhitelistEdge } from './whitelistService.edge';

// Re-export promoteFromWaitlist so callers can import all whitelist
// operations from one place. The implementation stays in waitlistService
// because it also mutates waitlist rows inside a transaction.
export { promoteFromWaitlist } from './waitlistService';

// =============================================================================
// Types
// =============================================================================

export type WhitelistStatus = 'permanent' | 'trial' | 'expired' | 'inactive' | 'none';

export interface WhitelistStatusResult {
  status: WhitelistStatus;
  expiresAt?: Date;
}

/** Unified result for checkWhitelist / checkWhitelistEdge */
export interface WhitelistResult {
  allowed: boolean;
  reason?: string;
  expiresAt?: Date;
}

// =============================================================================
// Active-entry predicate (shared by Prisma queries)
// =============================================================================

/** Prisma WHERE fragment: entry exists, is active, and not expired. */
function activeEntryWhere(address: string) {
  return {
    address: address.toLowerCase(),
    isActive: true,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  };
}

// =============================================================================
// Check — Node.js (Prisma)
// =============================================================================

/**
 * Unified whitelist check. Returns { allowed, reason?, expiresAt? }.
 * Use this as the primary API for "can this address access the app?"
 */
export async function checkWhitelist(address: string): Promise<WhitelistResult> {
  const entry = await prisma.whitelistEntry.findUnique({
    where: { address: address.toLowerCase() },
    select: { isActive: true, expiresAt: true },
  });

  if (!entry) return { allowed: false, reason: 'not_found' };
  if (!entry.isActive) return { allowed: false, reason: 'inactive' };
  if (entry.expiresAt && entry.expiresAt <= new Date()) {
    return { allowed: false, reason: 'expired', expiresAt: entry.expiresAt };
  }

  return {
    allowed: true,
    ...(entry.expiresAt ? { expiresAt: entry.expiresAt } : {}),
  };
}

// =============================================================================
// Legacy convenience wrappers (preserved for existing consumers)
// =============================================================================

/**
 * Get the whitelist status for an address.
 * Distinguishes between permanent, active trial, expired trial, inactive, and not found.
 */
export async function getWhitelistStatus(address: string): Promise<WhitelistStatusResult> {
  const entry = await prisma.whitelistEntry.findUnique({
    where: { address: address.toLowerCase() },
    select: { isActive: true, expiresAt: true },
  });

  if (!entry) return { status: 'none' };
  if (!entry.isActive) return { status: 'inactive' };
  if (!entry.expiresAt) return { status: 'permanent' };
  if (entry.expiresAt > new Date()) return { status: 'trial', expiresAt: entry.expiresAt };
  return { status: 'expired', expiresAt: entry.expiresAt };
}

/**
 * Boolean check: is this address allowed right now?
 * Shorthand over checkWhitelist for callers that just need true/false.
 */
export async function isWhitelisted(address: string): Promise<boolean> {
  const { allowed } = await checkWhitelist(address);
  return allowed;
}

// =============================================================================
// CRUD — Admin operations
// =============================================================================

/**
 * Add an address to the whitelist.
 * If a soft-deleted row exists for this address, reactivates it.
 * Returns null only if the address is already actively whitelisted.
 */
export async function addToWhitelist(
  address: string,
  label?: string,
  addedBy?: string,
  expiresAt?: Date
): Promise<{ id: string; address: string; label: string | null } | null> {
  const normalised = address.toLowerCase();

  // Check if an active entry already exists — report as duplicate
  const existing = await prisma.whitelistEntry.findUnique({
    where: { address: normalised },
    select: { isActive: true },
  });

  if (existing?.isActive) return null;

  // Upsert: create new row OR reactivate a soft-deleted one
  const entry = await prisma.whitelistEntry.upsert({
    where: { address: normalised },
    create: {
      address: normalised,
      label: label ?? null,
      addedBy: addedBy ?? null,
      isActive: true,
      expiresAt: expiresAt ?? null,
    },
    update: {
      isActive: true,
      label: label ?? null,
      addedBy: addedBy ?? null,
      expiresAt: expiresAt ?? null,
    },
    select: { id: true, address: true, label: true },
  });
  return entry;
}

/**
 * Convert an existing whitelist entry to permanent access.
 * Used when a trial user earns promotion via referrals.
 */
export async function convertToPermanent(
  address: string,
  label?: string,
  addedBy?: string
): Promise<boolean> {
  try {
    await prisma.whitelistEntry.update({
      where: { address: address.toLowerCase() },
      data: {
        expiresAt: null,
        isActive: true,
        ...(label && { label }),
        ...(addedBy && { addedBy }),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove an address from the whitelist (soft delete — sets isActive=false).
 * The row is preserved for audit history. Use listRemovedWhitelist() to view.
 */
export async function removeFromWhitelist(address: string): Promise<boolean> {
  try {
    await prisma.whitelistEntry.update({
      where: { address: address.toLowerCase() },
      data: { isActive: false },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk-add addresses to the whitelist. Skips duplicates.
 */
export async function bulkAddToWhitelist(
  entries: Array<{ address: string; label?: string }>,
  addedBy?: string
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  for (const entry of entries) {
    const result = await addToWhitelist(entry.address, entry.label, addedBy);
    if (result) {
      added++;
    } else {
      skipped++;
    }
  }

  return { added, skipped };
}

/**
 * List whitelist entries with pagination.
 */
export async function listWhitelist(
  page = 1,
  limit = 50
): Promise<{
  entries: Array<{
    id: string;
    address: string;
    label: string | null;
    addedBy: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
}> {
  const where = { isActive: true };
  const [entries, total] = await Promise.all([
    prisma.whitelistEntry.findMany({
      where,
      select: {
        id: true,
        address: true,
        label: true,
        addedBy: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whitelistEntry.count({ where }),
  ]);

  return { entries, total };
}

/**
 * List soft-deleted whitelist entries (isActive=false) with pagination.
 * Used by admin to view removal history and reactivate if needed.
 */
export async function listRemovedWhitelist(
  page = 1,
  limit = 50
): Promise<{
  entries: Array<{
    id: string;
    address: string;
    label: string | null;
    addedBy: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}> {
  const where = { isActive: false };
  const [entries, total] = await Promise.all([
    prisma.whitelistEntry.findMany({
      where,
      select: {
        id: true,
        address: true,
        label: true,
        addedBy: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whitelistEntry.count({ where }),
  ]);

  return { entries, total };
}
