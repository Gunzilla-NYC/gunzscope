/**
 * Waitlist Service
 *
 * Manages the viral waitlist: non-whitelisted wallets join a queue,
 * get an auto-generated referral link, and auto-promote to whitelist
 * after reaching a referral threshold (default: 3 wallet connections).
 */

import prisma from '../db';
import { getOrCreateAutoHandle } from './referralService';

// =============================================================================
// Constants
// =============================================================================

/** Default referral threshold for auto-promotion */
export const DEFAULT_PROMOTION_THRESHOLD = 3;

// =============================================================================
// Types
// =============================================================================

export interface WaitlistEntryData {
  id: string;
  address: string;
  referrerId: string | null;
  status: string;
  referralCount: number;
  promotionThreshold: number;
  promotedAt: Date | null;
  promotedBy: string | null;
  createdAt: Date;
}

export interface WaitlistStatus {
  waitlisted: true;
  position: number;
  referralCount: number;
  promotionThreshold: number;
  referralLink: string | null;
  slug: string | null;
}

export interface PromotionResult {
  promoted: boolean;
  reason?: 'threshold_met' | 'admin';
}

// =============================================================================
// Join Waitlist
// =============================================================================

/**
 * Add a wallet to the waitlist and auto-create a referral handle.
 * Idempotent: if already waitlisted, returns existing entry.
 */
export async function joinWaitlist(
  address: string,
  ipHash?: string | null,
): Promise<WaitlistEntryData> {
  const normalized = address.toLowerCase();

  // Already on waitlist? Return existing.
  const existing = await prisma.waitlistEntry.findUnique({
    where: { address: normalized },
  });
  if (existing) return existing;

  // Create auto-handle for referral link
  const referrer = await getOrCreateAutoHandle(normalized);

  // Create waitlist entry with referrer FK
  return prisma.waitlistEntry.create({
    data: {
      address: normalized,
      referrerId: referrer.id,
      promotionThreshold: DEFAULT_PROMOTION_THRESHOLD,
      ipHash: ipHash ?? null,
    },
  });
}

// =============================================================================
// Lookup
// =============================================================================

export async function getWaitlistEntry(
  address: string,
): Promise<WaitlistEntryData | null> {
  return prisma.waitlistEntry.findUnique({
    where: { address: address.toLowerCase() },
  });
}

export async function getWaitlistPosition(address: string): Promise<number> {
  const normalized = address.toLowerCase();
  const entry = await prisma.waitlistEntry.findUnique({
    where: { address: normalized },
    select: { createdAt: true },
  });
  if (!entry) return 0;

  // Position = count of waiting entries created before this one + 1
  const ahead = await prisma.waitlistEntry.count({
    where: {
      status: 'waiting',
      createdAt: { lt: entry.createdAt },
    },
  });
  return ahead + 1;
}

export async function getWaitlistStatus(
  address: string,
): Promise<WaitlistStatus | null> {
  const normalized = address.toLowerCase();
  const entry = await prisma.waitlistEntry.findUnique({
    where: { address: normalized },
    include: { referrer: true },
  });
  if (!entry || entry.status !== 'waiting') return null;

  const position = await getWaitlistPosition(normalized);

  return {
    waitlisted: true,
    position,
    referralCount: entry.referralCount,
    promotionThreshold: entry.promotionThreshold,
    referralLink: entry.referrer
      ? `https://gunzscope.xyz/r/${entry.referrer.slug}`
      : null,
    slug: entry.referrer?.slug ?? null,
  };
}

// =============================================================================
// Referral Counting & Auto-Promotion
// =============================================================================

/**
 * Increment the referral count for a waitlisted referrer and check
 * if they've hit the promotion threshold.
 *
 * Called from referralService.recordWalletConnected when a wallet_connected
 * event is recorded for a referrer who is on the waitlist.
 */
export async function incrementReferralAndCheckPromotion(
  referrerId: string,
): Promise<PromotionResult> {
  // Find the waitlist entry linked to this referrer
  const entry = await prisma.waitlistEntry.findUnique({
    where: { referrerId },
  });
  if (!entry || entry.status !== 'waiting') {
    return { promoted: false };
  }

  // Atomically increment referral count
  const updated = await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: { referralCount: { increment: 1 } },
  });

  // Check threshold
  if (updated.referralCount >= updated.promotionThreshold) {
    return promoteFromWaitlist(updated.address, 'auto');
  }

  return { promoted: false };
}

/**
 * Promote a waitlisted address to the whitelist.
 * Creates WhitelistEntry and marks WaitlistEntry as promoted.
 * Uses a transaction for atomicity.
 */
export async function promoteFromWaitlist(
  address: string,
  by: string, // "auto" | "admin"
): Promise<PromotionResult> {
  const normalized = address.toLowerCase();

  await prisma.$transaction(async (tx) => {
    // Mark waitlist entry as promoted
    await tx.waitlistEntry.update({
      where: { address: normalized },
      data: {
        status: by === 'admin' ? 'manual_promoted' : 'promoted',
        promotedAt: new Date(),
        promotedBy: by,
      },
    });

    // Add to whitelist (swallow unique constraint if already exists)
    try {
      await tx.whitelistEntry.create({
        data: {
          address: normalized,
          label: `waitlist:${by}`,
          addedBy: by,
        },
      });
    } catch {
      // Already whitelisted — that's fine
    }
  });

  return { promoted: true, reason: by === 'auto' ? 'threshold_met' : 'admin' };
}

// =============================================================================
// Admin
// =============================================================================

export async function listWaitlist(
  page = 1,
  limit = 50,
  status?: string,
): Promise<{
  entries: WaitlistEntryData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const where = status ? { status } : {};
  const [entries, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return {
    entries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getWaitlistStats(): Promise<{
  totalWaiting: number;
  totalPromoted: number;
  totalManualPromoted: number;
}> {
  const [totalWaiting, totalPromoted, totalManualPromoted] = await Promise.all([
    prisma.waitlistEntry.count({ where: { status: 'waiting' } }),
    prisma.waitlistEntry.count({ where: { status: 'promoted' } }),
    prisma.waitlistEntry.count({ where: { status: 'manual_promoted' } }),
  ]);

  return { totalWaiting, totalPromoted, totalManualPromoted };
}
