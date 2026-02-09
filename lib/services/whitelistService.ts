/**
 * Whitelist Service
 *
 * Address-based early access gate. Manages a database table of
 * whitelisted wallet addresses that can access the app without
 * needing an access code.
 */

import prisma from '../db';

/**
 * Check if an address is on the whitelist (case-insensitive).
 */
export async function isWhitelisted(address: string): Promise<boolean> {
  const entry = await prisma.whitelistEntry.findUnique({
    where: { address: address.toLowerCase() },
    select: { id: true },
  });
  return !!entry;
}

/**
 * Add an address to the whitelist.
 * Returns the entry, or null if the address already exists.
 */
export async function addToWhitelist(
  address: string,
  label?: string,
  addedBy?: string
): Promise<{ id: string; address: string; label: string | null } | null> {
  const normalised = address.toLowerCase();
  try {
    const entry = await prisma.whitelistEntry.create({
      data: {
        address: normalised,
        label: label ?? null,
        addedBy: addedBy ?? null,
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
    createdAt: Date;
  }>;
  total: number;
}> {
  const [entries, total] = await Promise.all([
    prisma.whitelistEntry.findMany({
      select: { id: true, address: true, label: true, addedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whitelistEntry.count(),
  ]);

  return { entries, total };
}
