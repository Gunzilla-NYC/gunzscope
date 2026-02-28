/**
 * Whitelist Service
 *
 * Address-based early access gate. Manages a database table of
 * whitelisted wallet addresses that can access the app without
 * needing an access code.
 *
 * Supports trial entries with an `expiresAt` timestamp (e.g. 72h Konami trial).
 * Null expiresAt = permanent access.
 */

import prisma from '../db';

export type WhitelistStatus = 'permanent' | 'trial' | 'expired' | 'none';

export interface WhitelistStatusResult {
  status: WhitelistStatus;
  expiresAt?: Date;
}

/**
 * Get the whitelist status for an address.
 * Distinguishes between permanent, active trial, expired trial, and not found.
 */
export async function getWhitelistStatus(address: string): Promise<WhitelistStatusResult> {
  const entry = await prisma.whitelistEntry.findUnique({
    where: { address: address.toLowerCase() },
    select: { expiresAt: true },
  });

  if (!entry) return { status: 'none' };
  if (!entry.expiresAt) return { status: 'permanent' };
  if (entry.expiresAt > new Date()) return { status: 'trial', expiresAt: entry.expiresAt };
  return { status: 'expired', expiresAt: entry.expiresAt };
}

/**
 * Check if an address is on the whitelist (case-insensitive).
 * Returns false for expired trial entries.
 */
export async function isWhitelisted(address: string): Promise<boolean> {
  const { status } = await getWhitelistStatus(address);
  return status === 'permanent' || status === 'trial';
}

/**
 * Add an address to the whitelist.
 * Returns the entry, or null if the address already exists.
 */
export async function addToWhitelist(
  address: string,
  label?: string,
  addedBy?: string,
  expiresAt?: Date
): Promise<{ id: string; address: string; label: string | null } | null> {
  const normalised = address.toLowerCase();
  try {
    const entry = await prisma.whitelistEntry.create({
      data: {
        address: normalised,
        label: label ?? null,
        addedBy: addedBy ?? null,
        expiresAt: expiresAt ?? null,
      },
      select: { id: true, address: true, label: true },
    });
    return entry;
  } catch {
    // Unique constraint violation — address already exists
    return null;
  }
}

/**
 * Convert an existing whitelist entry to permanent access.
 * Used when a trial user earns promotion via referrals.
 * Returns true if entry was found and updated, false otherwise.
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
 * Remove an address from the whitelist.
 */
export async function removeFromWhitelist(address: string): Promise<boolean> {
  try {
    await prisma.whitelistEntry.delete({
      where: { address: address.toLowerCase() },
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
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
}> {
  const [entries, total] = await Promise.all([
    prisma.whitelistEntry.findMany({
      select: { id: true, address: true, label: true, addedBy: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whitelistEntry.count(),
  ]);

  return { entries, total };
}
