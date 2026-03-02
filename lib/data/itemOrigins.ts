/**
 * Item Origins — Types and display constants.
 *
 * Data now lives in the database (item_origin_releases, item_origin_items,
 * item_origin_match_rules). For runtime lookups, use the ItemOriginsContext:
 *
 *   import { useItemOrigins } from '@/lib/contexts/ItemOriginsContext';
 *   const { getItemOrigin } = useItemOrigins();
 *
 * Admin CRUD: POST/PATCH/DELETE /api/admin/item-origins
 * Public read: GET /api/item-origins
 */

export type OriginCategory = 'battlepass' | 'pro_pack' | 'event' | 'ranked' | 'early_access' | 'reward' | 'content_pack';

export interface ItemRelease {
  /** Unique identifier for this release (maps to DB slug) */
  id: string;
  /** Display name for the release */
  name: string;
  /** Short label for badges (e.g., "ChemTech BP") */
  shortName: string;
  /** Origin category */
  category: OriginCategory;
  /** Release date (ISO 8601, day precision) */
  date: string | null;
  /** Optional event/release description with lore and mechanics */
  description?: string;
}

/** Pattern matching rule for items not individually listed */
export interface MatchRule {
  type: 'prefix' | 'contains';
  /** Pattern string (stored lowercase in DB) */
  pattern: string;
  /** References a release slug */
  releaseId: string;
}

// ════════════════════════════════════════════════════════════════
// Display Constants (UI-only, not stored in DB)
// ════════════════════════════════════════════════════════════════

/** Category display labels */
export const CATEGORY_LABELS: Record<OriginCategory, string> = {
  battlepass: 'Battle Pass',
  pro_pack: 'Pro',
  event: 'Event',
  ranked: 'Ranked',
  early_access: 'Early Access',
  reward: 'Reward',
  content_pack: 'Content',
};

/** Category badge colors (CSS variable names) */
export const CATEGORY_COLORS: Record<OriginCategory, { text: string; bg: string }> = {
  battlepass: { text: 'var(--gs-lime)', bg: 'var(--gs-lime)' },
  pro_pack: { text: 'var(--gs-purple-bright, #8B7AFF)', bg: 'var(--gs-purple, #6D5BFF)' },
  event: { text: '#22d3ee', bg: '#22d3ee' },
  ranked: { text: '#F59E0B', bg: '#F59E0B' },
  early_access: { text: '#FF8C00', bg: '#FF8C00' },
  reward: { text: '#10B981', bg: '#10B981' },
  content_pack: { text: '#60A5FA', bg: '#60A5FA' },
};
