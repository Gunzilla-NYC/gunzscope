'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { ItemRelease } from '@/lib/data/itemOrigins';
import type { ItemOriginsDataset } from '@/lib/services/itemOriginService';

// ─── Index built from API response ─────────────────────────────────

interface OriginIndex {
  releaseBySlug: Map<string, ItemRelease>;
  itemIndex: Map<string, ItemRelease>;       // lowercase name (or name::quality) → release
  rules: Array<{ type: string; pattern: string; release: ItemRelease }>;
}

function buildIndex(dataset: ItemOriginsDataset): OriginIndex {
  const releaseBySlug = new Map<string, ItemRelease>();
  for (const r of dataset.releases) {
    releaseBySlug.set(r.slug, {
      id: r.slug,
      name: r.name,
      shortName: r.shortName,
      category: r.category as ItemRelease['category'],
      date: r.date,
      description: r.description ?? undefined,
    });
  }

  const itemIndex = new Map<string, ItemRelease>();
  for (const item of dataset.items) {
    const release = releaseBySlug.get(item.releaseSlug);
    if (!release) continue;
    const key = item.quality ? `${item.itemName}::${item.quality}` : item.itemName;
    itemIndex.set(key, release);
  }

  // Rules are pre-sorted by priority descending from the API
  const rules = dataset.matchRules
    .map(r => {
      const release = releaseBySlug.get(r.releaseSlug);
      if (!release) return null;
      return { type: r.type, pattern: r.pattern, release };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return { releaseBySlug, itemIndex, rules };
}

// ─── Context ────────────────────────────────────────────────────────

type GetItemOriginFn = (itemName: string, quality?: string) => ItemRelease | null;

interface ItemOriginsContextValue {
  getItemOrigin: GetItemOriginFn;
  isLoaded: boolean;
}

const noop: GetItemOriginFn = () => null;

const ItemOriginsContext = createContext<ItemOriginsContextValue>({
  getItemOrigin: noop,
  isLoaded: false,
});

// ─── Provider ───────────────────────────────────────────────────────

export function ItemOriginsProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<OriginIndex | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/item-origins')
      .then(res => res.ok ? res.json() as Promise<ItemOriginsDataset> : null)
      .then(data => {
        if (data && !cancelled) setIndex(buildIndex(data));
      })
      .catch(() => { /* silent — getItemOrigin returns null until loaded */ });
    return () => { cancelled = true; };
  }, []);

  const getItemOrigin = useCallback<GetItemOriginFn>((itemName, quality?) => {
    if (!index) return null;
    const lower = itemName.toLowerCase();

    // 1. Composite key: name::quality
    if (quality) {
      const composite = index.itemIndex.get(`${lower}::${quality.toLowerCase()}`);
      if (composite) return composite;
    }

    // 2. Exact name match
    const exact = index.itemIndex.get(lower);
    if (exact) return exact;

    // 3. Pattern rules (ordered by priority)
    for (const rule of index.rules) {
      if (rule.type === 'prefix' && lower.startsWith(rule.pattern)) return rule.release;
      if (rule.type === 'contains' && lower.includes(rule.pattern)) return rule.release;
    }

    return null;
  }, [index]);

  const value = useMemo<ItemOriginsContextValue>(() => ({
    getItemOrigin,
    isLoaded: index !== null,
  }), [getItemOrigin, index]);

  return (
    <ItemOriginsContext.Provider value={value}>
      {children}
    </ItemOriginsContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useItemOrigins() {
  return useContext(ItemOriginsContext);
}
