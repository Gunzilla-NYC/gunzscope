/**
 * Ban Service
 *
 * Hard-blocks addresses from re-enrolling in the waitlist, using konami,
 * or reconciling wallets. Separate from whitelist removal (which is a soft reset).
 */

import prisma from '../db';

/**
 * Check if an address is banned (case-insensitive).
 */
export async function isBanned(address: string): Promise<boolean> {
  const entry = await prisma.banEntry.findUnique({
    where: { address: address.toLowerCase() },
    select: { id: true },
  });
  return !!entry;
}

/**
 * Ban an address: create ban entry + remove from whitelist + delete waitlist entry.
 * Idempotent — safe to call on an already-banned address.
 */
export async function banAddress(
  address: string,
  reason?: string,
  bannedBy?: string,
): Promise<void> {
  const normalized = address.toLowerCase();

  await prisma.$transaction(async (tx) => {
    // Upsert ban entry
    await tx.banEntry.upsert({
      where: { address: normalized },
      create: {
        address: normalized,
        reason: reason ?? null,
        bannedBy: bannedBy ?? 'admin',
      },
      update: {
        reason: reason ?? undefined,
        bannedBy: bannedBy ?? undefined,
      },
    });

    // Remove from whitelist if present
    try {
      await tx.whitelistEntry.delete({ where: { address: normalized } });
    } catch {
      // Not whitelisted — fine
    }

    // Remove from waitlist if present
    try {
      await tx.waitlistEntry.delete({ where: { address: normalized } });
    } catch {
      // Not on waitlist — fine
    }
  });
}

/**
 * Unban an address. Does NOT re-whitelist or re-enroll — user must rejoin manually.
 * Returns true if the ban was found and removed, false if not banned.
 */
export async function unbanAddress(address: string): Promise<boolean> {
  try {
    await prisma.banEntry.delete({
      where: { address: address.toLowerCase() },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset an address: remove from whitelist + waitlist without banning.
 * User can re-join fresh through normal channels.
 */
export async function resetAddress(address: string): Promise<void> {
  const normalized = address.toLowerCase();

  // Remove from whitelist if present
  try {
    await prisma.whitelistEntry.delete({ where: { address: normalized } });
  } catch {
    // Not whitelisted — fine
  }

  // Remove from waitlist if present
  try {
    await prisma.waitlistEntry.delete({ where: { address: normalized } });
  } catch {
    // Not on waitlist — fine
  }
}

/**
 * List banned addresses with pagination.
 */
export async function listBans(
  page = 1,
  limit = 50,
): Promise<{
  entries: Array<{
    id: string;
    address: string;
    reason: string | null;
    bannedBy: string;
    createdAt: Date;
  }>;
  total: number;
}> {
  const [entries, total] = await Promise.all([
    prisma.banEntry.findMany({
      select: { id: true, address: true, reason: true, bannedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.banEntry.count(),
  ]);

  return { entries, total };
}
