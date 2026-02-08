import prisma from '../db';

// =============================================================================
// Types
// =============================================================================

export type AlertType =
  | 'gun_price'
  | 'portfolio_digest'
  | 'floor_drop'
  | 'whale_tracker'
  | 'collection_drop'
  | 'snipe_alert';

export interface AlertPreferenceData {
  id: string;
  type: AlertType;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AlertLogData {
  id: string;
  type: string;
  subject: string;
  sentAt: string;
  metadata: Record<string, unknown>;
}

export interface SubscribedUser {
  userId: string;
  email: string;
  config: Record<string, unknown>;
}

// =============================================================================
// Queries
// =============================================================================

export async function getPreferences(userId: string): Promise<AlertPreferenceData[]> {
  const prefs = await prisma.alertPreference.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return prefs.map((p) => ({
    id: p.id,
    type: p.type as AlertType,
    enabled: p.enabled,
    config: JSON.parse(p.config) as Record<string, unknown>,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function upsertPreference(
  userId: string,
  type: AlertType,
  enabled: boolean,
  config: Record<string, unknown>
): Promise<AlertPreferenceData> {
  const configStr = JSON.stringify(config);

  const pref = await prisma.alertPreference.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, enabled, config: configStr },
    update: { enabled, config: configStr },
  });

  return {
    id: pref.id,
    type: pref.type as AlertType,
    enabled: pref.enabled,
    config: JSON.parse(pref.config) as Record<string, unknown>,
    createdAt: pref.createdAt.toISOString(),
    updatedAt: pref.updatedAt.toISOString(),
  };
}

export async function togglePreference(
  userId: string,
  type: AlertType,
  enabled: boolean
): Promise<boolean> {
  const existing = await prisma.alertPreference.findUnique({
    where: { userId_type: { userId, type } },
  });

  if (!existing) return false;

  await prisma.alertPreference.update({
    where: { id: existing.id },
    data: { enabled },
  });

  return true;
}

export async function deletePreference(userId: string, type: AlertType): Promise<boolean> {
  const existing = await prisma.alertPreference.findUnique({
    where: { userId_type: { userId, type } },
  });

  if (!existing) return false;

  await prisma.alertPreference.delete({ where: { id: existing.id } });
  return true;
}

/**
 * Get all users who have a specific alert type enabled and have an email set.
 * Used by cron jobs to know who to send alerts to.
 */
export async function getUsersWithAlert(type: AlertType): Promise<SubscribedUser[]> {
  const prefs = await prisma.alertPreference.findMany({
    where: { type, enabled: true },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  return prefs
    .filter((p) => p.user.email)
    .map((p) => ({
      userId: p.user.id,
      email: p.user.email!,
      config: JSON.parse(p.config) as Record<string, unknown>,
    }));
}

// =============================================================================
// Alert Logging
// =============================================================================

export async function logAlert(
  userId: string,
  type: string,
  subject: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await prisma.alertLog.create({
    data: {
      userId,
      type,
      subject,
      metadata: JSON.stringify(metadata),
    },
  });
}

export async function getRecentAlerts(userId: string, limit = 10): Promise<AlertLogData[]> {
  const logs = await prisma.alertLog.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });

  return logs.map((l) => ({
    id: l.id,
    type: l.type,
    subject: l.subject,
    sentAt: l.sentAt.toISOString(),
    metadata: JSON.parse(l.metadata) as Record<string, unknown>,
  }));
}

/**
 * Check if an alert was already sent for a given key within a time window.
 * Prevents duplicate alerts (e.g., same NFT floor drop alert within 24h).
 */
export async function wasAlertSentRecently(
  userId: string,
  type: string,
  dedupKey: string,
  windowMs: number = 24 * 60 * 60 * 1000
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);

  const existing = await prisma.alertLog.findFirst({
    where: {
      userId,
      type,
      sentAt: { gte: since },
      metadata: { contains: dedupKey },
    },
  });

  return !!existing;
}

// =============================================================================
// Price Cache
// =============================================================================

export async function getCachedValue(key: string): Promise<{ value: number; updatedAt: Date } | null> {
  const cached = await prisma.priceCache.findUnique({ where: { key } });
  if (!cached) return null;
  return { value: cached.value, updatedAt: cached.updatedAt };
}

export async function setCachedValue(key: string, value: number): Promise<void> {
  await prisma.priceCache.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
