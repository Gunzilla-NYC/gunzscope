/**
 * Item Origin Service
 *
 * Database-backed registry mapping NFT items to their game release/origin.
 * Replaces the previous static in-memory registry (lib/data/itemOrigins.ts).
 *
 * Three tables:
 *   - ItemOriginRelease: release metadata (battle pass, event, content pack, etc.)
 *   - ItemOriginItem: exact name → release mappings
 *   - ItemOriginMatchRule: prefix/contains pattern rules for bulk matching
 */

import prisma from '../db';

// ─── Dataset type returned by the public API ────────────────────────

export interface ItemOriginsDataset {
  releases: Array<{
    slug: string;
    name: string;
    shortName: string;
    category: string;
    date: string | null;
    description: string | null;
  }>;
  items: Array<{
    itemName: string;
    quality: string | null;
    releaseSlug: string;
  }>;
  matchRules: Array<{
    type: string;
    pattern: string;
    releaseSlug: string;
    priority: number;
  }>;
}

// ─── Full dataset fetch (for public API) ────────────────────────────

/**
 * Fetch the complete item origins dataset for client consumption.
 * Three parallel queries, returns a flat serializable object.
 */
export async function getAllItemOrigins(): Promise<ItemOriginsDataset> {
  const [releases, items, matchRules] = await Promise.all([
    prisma.itemOriginRelease.findMany({
      select: { slug: true, name: true, shortName: true, category: true, date: true, description: true },
      orderBy: { slug: 'asc' },
    }),
    prisma.itemOriginItem.findMany({
      select: { itemName: true, quality: true, releaseSlug: true },
      orderBy: { itemName: 'asc' },
    }),
    prisma.itemOriginMatchRule.findMany({
      select: { type: true, pattern: true, releaseSlug: true, priority: true },
      orderBy: { priority: 'desc' },
    }),
  ]);

  return { releases, items, matchRules };
}

// ─── Release CRUD ───────────────────────────────────────────────────

export async function listReleases() {
  return prisma.itemOriginRelease.findMany({
    include: { _count: { select: { items: true, matchRules: true } } },
    orderBy: { slug: 'asc' },
  });
}

export async function getRelease(slug: string) {
  return prisma.itemOriginRelease.findUnique({
    where: { slug },
    include: { items: true, matchRules: true },
  });
}

export async function createRelease(data: {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  date?: string | null;
  description?: string | null;
}) {
  try {
    return await prisma.itemOriginRelease.create({
      data: {
        slug: data.slug,
        name: data.name,
        shortName: data.shortName,
        category: data.category,
        date: data.date ?? null,
        description: data.description ?? null,
      },
    });
  } catch {
    return null; // Unique constraint violation (duplicate slug)
  }
}

export async function updateRelease(
  slug: string,
  data: Partial<{ name: string; shortName: string; category: string; date: string | null; description: string | null }>,
) {
  try {
    return await prisma.itemOriginRelease.update({
      where: { slug },
      data,
    });
  } catch {
    return null;
  }
}

export async function deleteRelease(slug: string): Promise<boolean> {
  try {
    await prisma.itemOriginRelease.delete({ where: { slug } });
    return true;
  } catch {
    return false;
  }
}

// ─── Item CRUD ──────────────────────────────────────────────────────

export async function listItems(releaseSlug?: string) {
  return prisma.itemOriginItem.findMany({
    where: releaseSlug ? { releaseSlug } : undefined,
    include: { release: { select: { slug: true, shortName: true } } },
    orderBy: { itemName: 'asc' },
  });
}

export async function createItem(data: {
  itemName: string;
  quality?: string;
  releaseSlug: string;
}) {
  try {
    return await prisma.itemOriginItem.create({
      data: {
        itemName: data.itemName.toLowerCase(),
        quality: data.quality || '',
        releaseSlug: data.releaseSlug,
      },
    });
  } catch {
    return null; // Duplicate itemName+quality
  }
}

export async function bulkCreateItems(
  items: Array<{ itemName: string; quality?: string; releaseSlug: string }>,
) {
  const results = { created: 0, skipped: 0 };
  for (const item of items) {
    const result = await createItem(item);
    if (result) results.created++;
    else results.skipped++;
  }
  return results;
}

export async function deleteItem(itemName: string, quality?: string): Promise<boolean> {
  try {
    await prisma.itemOriginItem.delete({
      where: { itemName_quality: { itemName: itemName.toLowerCase(), quality: quality || '' } },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Match Rule CRUD ────────────────────────────────────────────────

export async function listMatchRules(releaseSlug?: string) {
  return prisma.itemOriginMatchRule.findMany({
    where: releaseSlug ? { releaseSlug } : undefined,
    include: { release: { select: { slug: true, shortName: true } } },
    orderBy: { priority: 'desc' },
  });
}

export async function createMatchRule(data: {
  type: string;
  pattern: string;
  releaseSlug: string;
  priority?: number;
}) {
  try {
    return await prisma.itemOriginMatchRule.create({
      data: {
        type: data.type,
        pattern: data.pattern.toLowerCase(),
        releaseSlug: data.releaseSlug,
        priority: data.priority ?? 0,
      },
    });
  } catch {
    return null; // Duplicate type+pattern
  }
}

export async function deleteMatchRule(type: string, pattern: string): Promise<boolean> {
  try {
    await prisma.itemOriginMatchRule.delete({
      where: { type_pattern: { type, pattern: pattern.toLowerCase() } },
    });
    return true;
  } catch {
    return false;
  }
}
