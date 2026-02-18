/**
 * Item Origins — curated mapping of NFT items to their release/origin.
 *
 * Categories:
 *   battlepass   — seasonal battle pass rewards
 *   pro_pack     — OTG Pro Content Pack (creator/brand collaborations)
 *   event        — limited-time events and promotional drops
 *
 * To add items: find the release in RELEASES, add item names to `items[]`.
 * Item names are matched case-insensitively against nft.name.
 */

export type OriginCategory = 'battlepass' | 'pro_pack' | 'event';

export interface ItemRelease {
  /** Display name for the release */
  name: string;
  /** Short label for badges (e.g., "ChemTech BP") */
  shortName: string;
  /** Origin category */
  category: OriginCategory;
  /** Release date (ISO 8601, day precision) */
  date: string | null;
  /** NFT item names belonging to this release (case-insensitive match) */
  items: string[];
}

/** All known releases, ordered chronologically. */
export const RELEASES: ItemRelease[] = [
  // ── Events ──────────────────────────────────────────────
  {
    name: 'Pioneers Program',
    shortName: 'Pioneers',
    category: 'event',
    date: '2024-05-15',
    items: [],
  },
  {
    name: 'ALL-STARS USA',
    shortName: 'ALL-STARS',
    category: 'event',
    date: '2024-11-21',
    items: [],
  },
  {
    name: 'Crackhead Christmas Content Pack',
    shortName: 'Xmas Pack',
    category: 'event',
    date: '2024-12-13',
    items: [],
  },
  {
    name: 'Combat DJ',
    shortName: 'Combat DJ',
    category: 'event',
    date: '2025-03-15',
    items: [],
  },
  {
    name: 'APE-RIL Fools: The Great Ape Hunt',
    shortName: 'APE-RIL',
    category: 'event',
    date: '2025-04-01',
    items: [],
  },

  // ── Pro Content Packs ───────────────────────────────────
  {
    name: 'OTG Pro Content Pack: Save Democracy',
    shortName: 'Save Democracy',
    category: 'pro_pack',
    date: null, // date unknown
    items: [],
  },
  {
    name: 'OTG Pro Content Pack: Westcol',
    shortName: 'Westcol',
    category: 'pro_pack',
    date: '2025-03-27',
    items: [],
  },
  {
    name: 'OTG Pro Content Pack: Scump',
    shortName: 'Scump',
    category: 'pro_pack',
    date: null, // date unknown
    items: [],
  },
  {
    name: 'OTG Pro Content Pack: Nuestros Diablos',
    shortName: 'Nuestros Diablos',
    category: 'pro_pack',
    date: null, // date unknown
    items: [],
  },
  {
    name: 'OTG Pro Content Pack: Crash Test Ted',
    shortName: 'Crash Test Ted',
    category: 'pro_pack',
    date: '2025-05-02',
    items: [],
  },
  {
    name: 'OTG Pro Content Pack: PC vs Console',
    shortName: 'PC vs Console',
    category: 'pro_pack',
    date: '2025-06-06',
    items: [],
  },
  {
    name: 'OTG Pro Content Pack: Major Cracker Jack',
    shortName: 'Cracker Jack',
    category: 'pro_pack',
    date: null, // date unknown
    items: [],
  },

  // ── Battle Passes ───────────────────────────────────────
  {
    name: 'Battle Pass: ChemTech',
    shortName: 'ChemTech BP',
    category: 'battlepass',
    date: '2025-04-17',
    items: [],
  },
  {
    name: 'Battle Pass: Red Ant',
    shortName: 'Red Ant BP',
    category: 'battlepass',
    date: '2025-05-30',
    items: [],
  },
  {
    name: 'Battle Pass: Anti-Cheat',
    shortName: 'Anti-Cheat BP',
    category: 'battlepass',
    date: null, // date unknown
    items: [],
  },
  {
    name: 'Battle Pass: Drone Operator',
    shortName: 'Drone Op BP',
    category: 'battlepass',
    date: '2025-07-16',
    items: [],
  },
  {
    name: 'Battle Pass: Zero Chill',
    shortName: 'Zero Chill BP',
    category: 'battlepass',
    date: '2025-07-16',
    items: [],
  },

  // ── Content Packs (non-Pro) ─────────────────────────────
  {
    name: 'Content Pack: The Comeback',
    shortName: 'The Comeback',
    category: 'pro_pack',
    date: '2025-08-15',
    items: [],
  },
  {
    name: 'Content Pack: Don DeLulu',
    shortName: 'Don DeLulu',
    category: 'pro_pack',
    date: '2025-11-06',
    items: [
      'Don DeLulu',           // Full Body Skin
      'Il Silenzio',          // Hawk Variant
      'Heads, you\'re Liquidated', // Emote
      'Rose Gold',            // Profile Picture
      'Goldchain',            // Zero Badge
    ],
  },
  {
    name: 'Content Pack: Rockstar',
    shortName: 'Rockstar',
    category: 'pro_pack',
    date: '2026-02-12',
    items: [],
  },
  {
    name: 'Content Pack: DJ Golden Boi',
    shortName: 'DJ Golden Boi',
    category: 'pro_pack',
    date: '2025-12-30',
    items: [],
  },

  // ── Seasonal Events ─────────────────────────────────────
  {
    name: 'Trick, Treat or Die',
    shortName: 'Halloween',
    category: 'event',
    date: '2025-10-17',
    items: [
      // Achievement reward:
      'Hell Sack Mask',
      // Community event rewards (666 total):
      'Sackrifice Mask',
      // Halloween Hex items (limited 100/platform):
      'Psycho Mask',
      // TODO: 3x Spooky Character Sets (10 items), 5x Emotes,
      //       2x Profile Banners, 15x Halloween Avatars,
      //       3x Weapon Skins (72 total) — need exact item names
    ],
  },
  {
    name: 'Hexmas',
    shortName: 'Hexmas',
    category: 'event',
    date: null, // date unknown — December 2025 holiday event
    items: [
      'Happy Hexmas #1',
      'Coca Claus Shorts',
      'Golden Booties',
      'Sleigh \'N Slay Puffer',
      'Jingle Brawl Beret',
      'Methlebell #1',
      'Tweakle Toes Shirt',
      'Jingle Frags #1',
      'Skele-Claus #1',
      'Hawk Blue Blood',
      'Meth Made',
      'Ho Ho Hoes #1',
      'Tweakle Toes #1',
      'Jingle Slay Puffer',
      'Kite Blue Blood',
      'Tap9 Blue Blood',
      'Tree-Top Trigger #1',
      'Sleigh Bitch #1',
      'Sugarplum Beanie',
      'Squall Blue Blood',
      'Minty Beanie',
      'Merry Killmas #1',
      'Home A-Lone #1',
    ],
  },

  // ── Hexmas Battle Pass ──────────────────────────────────
  {
    name: 'Battle Pass: Hexmas',
    shortName: 'Hexmas BP',
    category: 'battlepass',
    date: null, // same period as Hexmas event
    items: [
      'Meth The Halls Jetpack',
    ],
  },

  // ── Mrs Crackhead Santa Content Pack ────────────────────
  {
    name: 'Content Pack: Mrs Crackhead Santa',
    shortName: 'Mrs Crackhead Santa',
    category: 'pro_pack',
    date: null, // released during Hexmas event
    items: [
      'Woodpecker Nutkrakka',
      'Mrs Crackhead Santa',
      'Sleigh Queen',
      'Ms Santa Slay #1',
    ],
  },
];

// ── Lookup Index ──────────────────────────────────────────

/** Pre-built case-insensitive index: lowercase item name → release */
const itemIndex = new Map<string, ItemRelease>();

for (const release of RELEASES) {
  for (const item of release.items) {
    itemIndex.set(item.toLowerCase(), release);
  }
}

/** Category display labels */
export const CATEGORY_LABELS: Record<OriginCategory, string> = {
  battlepass: 'Battle Pass',
  pro_pack: 'Pro Pack',
  event: 'Event',
};

/** Category badge colors (CSS variable names) */
export const CATEGORY_COLORS: Record<OriginCategory, { text: string; bg: string }> = {
  battlepass: { text: 'var(--gs-lime)', bg: 'var(--gs-lime)' },
  pro_pack: { text: 'var(--gs-purple-bright, #8B7AFF)', bg: 'var(--gs-purple, #6D5BFF)' },
  event: { text: '#22d3ee', bg: '#22d3ee' },
};

/**
 * Look up the origin release for an NFT by its name.
 * Returns null if the item isn't in any known release.
 */
export function getItemOrigin(itemName: string): ItemRelease | null {
  return itemIndex.get(itemName.toLowerCase()) ?? null;
}

/**
 * Rebuild the lookup index. Call this if you dynamically modify RELEASES.
 * Not needed for static usage.
 */
export function rebuildIndex(): void {
  itemIndex.clear();
  for (const release of RELEASES) {
    for (const item of release.items) {
      itemIndex.set(item.toLowerCase(), release);
    }
  }
}
