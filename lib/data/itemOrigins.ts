/**
 * Item Origins — scalable registry mapping NFT items to their release/origin.
 *
 * Architecture:
 *   RELEASES      — metadata-only release definitions (id, name, category, date)
 *   ITEM_REGISTRY — flat [itemName, releaseId] tuples (one line per item)
 *   MATCH_RULES   — prefix/contains pattern rules for bulk matching
 *
 * To add items:
 *   1. Find (or add) the release in RELEASES
 *   2. Add a tuple to ITEM_REGISTRY: ['Item Name', 'release-id']
 *   3. For wildcard patterns, add a rule to MATCH_RULES
 *
 * Composite keys for multi-quality items (guns/legs/arms):
 *   ['Item Name::epic', 'release-id']  — matched when quality is provided
 */

export type OriginCategory = 'battlepass' | 'pro_pack' | 'event' | 'ranked';

export interface ItemRelease {
  /** Unique identifier for this release */
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
  /** Pattern string (stored as-is, lowercased at index build time) */
  pattern: string;
  /** References a release id */
  releaseId: string;
}

// ════════════════════════════════════════════════════════════════
// RELEASES — metadata only, no items
// ════════════════════════════════════════════════════════════════

const RELEASES: ReadonlyArray<ItemRelease> = [
  // ── Events ──────────────────────────────────────────────
  { id: 'pioneers',       name: 'Pioneers Program',                    shortName: 'Pioneers',           category: 'event',      date: '2024-05-15' },
  { id: 'all-stars',      name: 'ALL-STARS USA',                       shortName: 'ALL-STARS',          category: 'event',      date: '2024-11-21' },
  { id: 'xmas-pack',      name: 'Crackhead Christmas Content Pack',    shortName: 'Xmas Pack',          category: 'event',      date: '2024-12-13' },
  { id: 'combat-dj',      name: 'Combat DJ',                           shortName: 'Combat DJ',          category: 'event',      date: '2025-03-15' },
  { id: 'aperil-event',   name: 'APE-RIL Fools: The Great Ape Hunt',   shortName: 'APE-RIL',            category: 'event',      date: '2025-04-01' },
  {
    id: 'halloween',
    name: 'Trick, Treat or Die',
    shortName: 'Trick, Treat or Die',
    category: 'event',
    date: '2025-10-17',
    description: [
      'Candy Bag Collectibles: 10 Candy bags scattered across the island. Collect all 10 to unlock the "Tooch Decayer" achievement in the Career Page event tab, rewarding the Hell Sack Mask. First Zero to find all 10 gets Serial Number #1.',
      'Halloween-themed Hexes: Found around the map or purchasable for GUN from the main menu (testnet only, limited to 2 per day). Contents: Single-Use Psycho Mask (limited 100 per platform), 3x Spooky Character Sets (10 items), 5x Emotes, 2x Profile Banners, 15x Halloween Profile Avatars, 3x New Weapon Skins (72 skins total).',
      'Community Events: 666 Sackrifice Masks distributed through community events throughout October, rewarding dedicated killers on Feardrop Island.',
    ].join(' | '),
  },
  { id: 'hexmas',         name: 'Hexmas',                              shortName: 'Hexmas',             category: 'event',      date: null },
  { id: 'neotokyo',       name: 'Neotokyo',                            shortName: 'Neotokyo',           category: 'event',      date: null },
  { id: 'loyalty',        name: 'Loyalty Rewards',                     shortName: 'Loyalty',            category: 'event',      date: null },

  // ── Pro Content Packs ───────────────────────────────────
  { id: 'save-democracy', name: 'OTG Pro Content Pack: Save Democracy', shortName: 'Save Democracy',    category: 'pro_pack',   date: null },
  { id: 'westcol',        name: 'OTG Pro Content Pack: Westcol',        shortName: 'Westcol',           category: 'pro_pack',   date: '2025-03-27' },
  { id: 'scump',          name: 'OTG Pro Content Pack: Scump',          shortName: 'Scump',             category: 'pro_pack',   date: null },
  { id: 'nuestros',       name: 'OTG Pro Content Pack: Nuestros Diablos', shortName: 'Nuestros Diablos', category: 'pro_pack',  date: null },
  { id: 'crash-test-ted', name: 'OTG Pro Content Pack: Crash Test Ted',  shortName: 'Crash Test Ted',   category: 'pro_pack',   date: '2025-05-02' },
  { id: 'pc-vs-console',  name: 'OTG Pro Content Pack: PC vs Console',   shortName: 'PC vs Console',    category: 'pro_pack',   date: '2025-06-06' },
  { id: 'cracker-jack',   name: 'OTG Pro Content Pack: Major Cracker Jack', shortName: 'Cracker Jack',  category: 'pro_pack',   date: null },

  // ── Content Packs (non-Pro) ─────────────────────────────
  { id: 'the-comeback',         name: 'Content Pack: The Comeback',          shortName: 'The Comeback',          category: 'pro_pack', date: '2025-08-15' },
  { id: 'don-delulu',           name: 'Content Pack: Don DeLulu',            shortName: 'Don DeLulu',            category: 'pro_pack', date: '2025-11-06' },
  { id: 'rockstar',             name: 'Content Pack: Rockstar',              shortName: 'Rockstar',              category: 'pro_pack', date: '2026-02-12' },
  { id: 'dj-golden-boi',        name: 'Content Pack: DJ Golden Boi',         shortName: 'DJ Golden Boi',         category: 'pro_pack', date: '2025-12-30' },
  { id: 'mrs-crackhead-santa',  name: 'Content Pack: Mrs Crackhead Santa',   shortName: 'Mrs Crackhead Santa',   category: 'pro_pack', date: null },
  { id: 'aperil-fools-cp',      name: 'Content Pack: APE-RIL Fools',         shortName: 'APE-RIL Fools CP',      category: 'pro_pack', date: '2025-04-01' },

  // ── Battle Passes ───────────────────────────────────────
  { id: 'chemtech-bp',       name: 'Battle Pass: ChemTech',        shortName: 'ChemTech BP',       category: 'battlepass', date: '2025-04-17' },
  { id: 'red-ant-bp',        name: 'Battle Pass: Red Ant',         shortName: 'Red Ant BP',        category: 'battlepass', date: '2025-05-30' },
  { id: 'anti-cheat-bp',     name: 'Battle Pass: Anti-Cheat',      shortName: 'Anti-Cheat BP',     category: 'battlepass', date: null },
  { id: 'drone-op-bp',       name: 'Battle Pass: Drone Operator',  shortName: 'Drone Op BP',       category: 'battlepass', date: '2025-07-16' },
  { id: 'zero-chill-bp',     name: 'Battle Pass: Zero Chill',      shortName: 'Zero Chill BP',     category: 'battlepass', date: '2025-07-16' },
  { id: 'hexmas-bp',         name: 'Battle Pass: Hexmas',          shortName: 'Hexmas BP',         category: 'battlepass', date: null },
  { id: 'black-friday-bp',   name: 'Battle Pass: Black Friday',    shortName: 'Black Friday BP',   category: 'battlepass', date: null },
  { id: 'templar-bp',        name: 'Battle Pass: Templar',         shortName: 'Templar BP',        category: 'battlepass', date: null },
  { id: 'kiiro-shinobi-bp',  name: 'Battle Pass: Kiiro Shinobi',   shortName: 'Kiiro Shinobi BP',  category: 'battlepass', date: null },
  { id: 'anarchist-bp',      name: 'Battle Pass: Anarchist',       shortName: 'Anarchist BP',      category: 'battlepass', date: null },
  { id: 'hitori-yubi-bp',   name: 'Battle Pass: Hitori Yubi',     shortName: 'Hitori Yubi BP',    category: 'battlepass', date: null },
  { id: 'hopper-pilot-bp',  name: 'Battle Pass: Hopper Pilot',    shortName: 'Hopper Pilot BP',   category: 'battlepass', date: null },
  { id: 'mad-biker-bp',    name: 'Battle Pass: Mad Biker',       shortName: 'Mad Biker BP',      category: 'battlepass', date: null },
  { id: 'enforcer-bp',    name: 'Battle Pass: Enforcer',        shortName: 'Enforcer BP',       category: 'battlepass', date: null },
  { id: 'pink-fury-bp',  name: 'Battle Pass: Pink Fury',       shortName: 'Pink Fury BP',      category: 'battlepass', date: null },
  { id: 'mr-fuckles-bp', name: 'Battle Pass: Mr Fuckles',      shortName: 'Mr Fuckles BP',     category: 'battlepass', date: null },

  // ── Ranked ──────────────────────────────────────────────
  { id: 'ranked-s1',  name: 'Ranked Season 1',  shortName: 'Ranked S1',  category: 'ranked', date: null },
];

// ════════════════════════════════════════════════════════════════
// ITEM_REGISTRY — flat [itemName, releaseId] tuples
// ════════════════════════════════════════════════════════════════

const ITEM_REGISTRY: ReadonlyArray<readonly [string, string]> = [
  // ── APE-RIL Event ───────────────────────────────────────
  ["Ape-Fool's Gold Mask",              'aperil-event'],
  ['Ape-Fool Mask',                     'aperil-event'],
  ['Apex Predator Skin for the Kite',   'aperil-event'],
  ['Apex Predator Skin for the Flenser', 'aperil-event'],

  // ── Halloween ───────────────────────────────────────────
  ['Hell Sack Mask',        'halloween'],
  ['Hell Sack',             'halloween'],
  ['Sackrifice Mask',       'halloween'],
  ['Psycho Mask',           'halloween'],
  ['Single-Use Psycho',     'halloween'],
  ['Sack the Ripper #1',    'halloween'],

  // ── Hexmas ──────────────────────────────────────────────
  ['Happy Hexmas #1',                    'hexmas'],
  ['Silent Night Beret',                  'hexmas'],
  ['Tinsel Trauma Trail',                 'hexmas'],
  ['Coca Claus Shorts',                  'hexmas'],
  ['Golden Booties',                     'hexmas'],
  ["Sleigh 'N Slay Puffer",             'hexmas'],
  ['Jingle Brawl Beret',                'hexmas'],
  ['Methlebell #1',                      'hexmas'],
  ['Tweakle Toes Shirt',                'hexmas'],
  ['Jingle Frags #1',                    'hexmas'],
  ['Skele-Claus #1',                     'hexmas'],
  ['Hawk Blue Blood',                    'hexmas'],
  ['Meth Made',                          'hexmas'],
  ['Ho Ho Hoes #1',                      'hexmas'],
  ['Tweakle Toes #1',                    'hexmas'],
  ['Jingle Slay Puffer',                'hexmas'],
  ['Kite Blue Blood',                    'hexmas'],
  ['Tap9 Blue Blood',                    'hexmas'],
  ['Tree-Top Trigger #1',               'hexmas'],
  ['Sleigh Bitch #1',                    'hexmas'],
  ['Sugarplum Beanie',                  'hexmas'],
  ['Squall Blue Blood',                  'hexmas'],
  ['Minty Beanie',                       'hexmas'],
  ['Merry Killmas #1',                   'hexmas'],
  ['Home A-Lone #1',                     'hexmas'],
  ['Nutkrakka Tinsel Hat',              'hexmas'],
  ['Tacoma Blue Blood',                  'hexmas'],
  ['Coca Claus Puffer',                  'hexmas'],
  ['Kush Kringle Puffer',               'hexmas'],
  ['Kush Kringle Shorts',               'hexmas'],
  ['Skullmas Beret',                     'hexmas'],
  ['Crater Claus #1',                    'hexmas'],
  ['Coca Claus Hat',                     'hexmas'],
  ['Kush Kringle Hat',                   'hexmas'],
  ['Nutkrakka Bauble Shorts',           'hexmas'],
  ['Merry Methmoon #1',                  'hexmas'],
  ['Glykobitz - North Pole Pussy',      'hexmas'],
  ['Glykobitz - Santa Pay Me',          'hexmas'],
  ["Glykobitz - It's Beginning to Look a Lot Like Teardrop", 'hexmas'],
  ['Glykobitz - Sleigh Bitch',          'hexmas'],
  ['Glykobitz - Carol of the Damned',   'hexmas'],
  ['Glykobitz - Maul Cop',              'hexmas'],

  // ── Hexmas BP ───────────────────────────────────────────
  ['Meth The Halls Jetpack',  'hexmas-bp'],

  // ── Mrs Crackhead Santa CP ──────────────────────────────
  ['Woodpecker Nutkrakka',    'mrs-crackhead-santa'],
  ['Mrs Crackhead Santa',     'mrs-crackhead-santa'],
  ['Sleigh Queen',            'mrs-crackhead-santa'],
  ['Ms Santa Slay #1',       'mrs-crackhead-santa'],

  // ── APE-RIL Fools CP ───────────────────────────────────
  ['M4 Ape-X Predator',        'aperil-fools-cp'],
  ['Alpha Ape Shit Set',       'aperil-fools-cp'],
  ['Banana Rekt Republic Set', 'aperil-fools-cp'],
  ['Going Apeshit',            'aperil-fools-cp'],
  ['Woodpecker Banananizer',   'aperil-fools-cp'],

  // ── Don DeLulu CP ───────────────────────────────────────
  ['Don DeLulu',                  'don-delulu'],
  ['Il Silenzio',                 'don-delulu'],
  ["Heads, you're Liquidated",   'don-delulu'],
  ['Rose Gold',                   'don-delulu'],
  ['Goldchain',                   'don-delulu'],

  // ── Red Ant BP ──────────────────────────────────────────
  ['Red Ant Jetpack',    'red-ant-bp'],
  ['Red Ant Helmet',     'red-ant-bp'],
  ['Mavinga Red Ant',    'red-ant-bp'],
  ['Red Ant Mask',       'red-ant-bp'],
  ['Red Ant Shirt',      'red-ant-bp'],
  ['Red Ant Shorts',     'red-ant-bp'],
  ['Red Ant Sneakers',   'red-ant-bp'],
  ['Red Ant Tac Vest',   'red-ant-bp'],
  ['Red Ant Visor',      'red-ant-bp'],

  // ── Templar BP ──────────────────────────────────────────
  ['Templar T-shirt',    'templar-bp'],
  ['Templar Tac Vest',   'templar-bp'],
  ['Kestrel Templar',    'templar-bp'],
  ['Templar Helmet',     'templar-bp'],
  ['Templar Shorts',     'templar-bp'],
  ['Templar Mask',       'templar-bp'],
  ['Templar Jetpack',    'templar-bp'],

  // ── Kiiro Shinobi BP ───────────────────────────────────
  ['Kiiro Shinobi Pants',    'kiiro-shinobi-bp'],
  ['Kiiro Shinobi Hoodie',   'kiiro-shinobi-bp'],
  ['Kelowna Kiiro Shinobi',  'kiiro-shinobi-bp'],
  ['Kiiro Shinobi Vest',     'kiiro-shinobi-bp'],
  ['Kiiro Shinobi Mask',     'kiiro-shinobi-bp'],
  ['Kiiro Shinobi Jetpack',  'kiiro-shinobi-bp'],

  // ── Anarchist BP ────────────────────────────────────────
  ['Anarchist Tac Vest',   'anarchist-bp'],
  ['Anarchist T-Shirt',    'anarchist-bp'],
  ['Anarchist Shorts',     'anarchist-bp'],
  ['Hawk Anarchist',       'anarchist-bp'],
  ['Anarchist Jetpack',    'anarchist-bp'],
  ['Anarchist Helmet',     'anarchist-bp'],

  // ── Ranked Season 1 ────────────────────────────────────
  ['M4 Commodore Icon',       'ranked-s1'],
  ['Icon',                    'ranked-s1'],
  ['M4 Commodore Celebrity',  'ranked-s1'],
  ['Celebrity',               'ranked-s1'],
  ['M4 Commodore Lead Actor', 'ranked-s1'],
  ['Lead Actor',              'ranked-s1'],
  ['M4 Commodore Cameo',      'ranked-s1'],
  ['Cameo',                   'ranked-s1'],
  ['Legend',                   'ranked-s1'],
  ['M4 Commodore Legend',     'ranked-s1'],
  ['Star',                    'ranked-s1'],
  ['M4 Commodore Star',      'ranked-s1'],
  ['M4 Commodore Extra',     'ranked-s1'],
  ['Extra',                  'ranked-s1'],

  // ── Hitori Yubi BP ───────────────────────────────────────
  ['Hitori Yubi Mask',       'hitori-yubi-bp'],
  ['Hitori Yubi #1',         'hitori-yubi-bp'],
  ['Hitori Yubi Vest',       'hitori-yubi-bp'],
  ['Hitori Yubi Pants',      'hitori-yubi-bp'],
  ['Hitori Yubi T-Shirt',    'hitori-yubi-bp'],
  ['Tacoma Yubikiri',        'hitori-yubi-bp'],
  ['Zankoku Jetpack',        'hitori-yubi-bp'],

  // ── Enforcer BP ──────────────────────────────────────────
  ['M4 Commodore Enforcer', 'enforcer-bp'],

  // ── Mad Biker BP ─────────────────────────────────────────
  ['Flenser Mad Biker',     'mad-biker-bp'],

  // ── Pink Fury BP ────────────────────────────────────────
  ['Vulture Pink Fury',     'pink-fury-bp'],

  // ── Loyalty Rewards ─────────────────────────────────────
  ['Loyalty Reward',                   'loyalty'],
  ['Cyan Croc Skin for the Vulture',   'loyalty'],
];

// ════════════════════════════════════════════════════════════════
// MATCH_RULES — prefix/contains patterns for bulk matching
// ════════════════════════════════════════════════════════════════

const MATCH_RULES: ReadonlyArray<MatchRule> = [
  { type: 'prefix',   pattern: 'Candy Coater for the',   releaseId: 'hexmas' },
  { type: 'prefix',   pattern: 'Present Tense for the', releaseId: 'hexmas' },
  { type: 'prefix',   pattern: 'Glykobitz',             releaseId: 'hexmas' },
  { type: 'prefix',   pattern: 'Black Friday',          releaseId: 'black-friday-bp' },
  { type: 'prefix',   pattern: 'Hopper Pilot',          releaseId: 'hopper-pilot-bp' },
  { type: 'prefix',   pattern: 'Mad Biker',             releaseId: 'mad-biker-bp' },
  { type: 'prefix',   pattern: 'Enforcer',              releaseId: 'enforcer-bp' },
  { type: 'prefix',   pattern: 'Corporate Enforcer',    releaseId: 'enforcer-bp' },
  { type: 'prefix',   pattern: 'Pink Fury',             releaseId: 'pink-fury-bp' },
  { type: 'prefix',   pattern: 'Mr Fuckles',            releaseId: 'mr-fuckles-bp' },
  { type: 'contains', pattern: 'Westcol',              releaseId: 'westcol' },
  { type: 'contains', pattern: 'Neotokyo',             releaseId: 'neotokyo' },
  { type: 'contains', pattern: 'Red Monster',          releaseId: 'halloween' },
  { type: 'contains', pattern: 'Feral Beast',          releaseId: 'halloween' },
  { type: 'contains', pattern: 'Grey Monster',         releaseId: 'halloween' },
  { type: 'contains', pattern: 'Il Silenzio',          releaseId: 'don-delulu' },
  { type: 'contains', pattern: 'Don DeLulu',           releaseId: 'don-delulu' },
  { type: 'contains', pattern: 'Rose Gold',            releaseId: 'don-delulu' },
  { type: 'contains', pattern: 'Goldchain',            releaseId: 'don-delulu' },
  { type: 'contains', pattern: "you're Liquidated",    releaseId: 'don-delulu' },
  { type: 'contains', pattern: 'Crackhead Santa',      releaseId: 'mrs-crackhead-santa' },
  { type: 'contains', pattern: 'Sleigh Queen',          releaseId: 'mrs-crackhead-santa' },
  { type: 'contains', pattern: 'Ms Santa Slay',         releaseId: 'mrs-crackhead-santa' },
  { type: 'contains', pattern: 'Nutkrakka',             releaseId: 'mrs-crackhead-santa' },
];

// ════════════════════════════════════════════════════════════════
// Display Constants
// ════════════════════════════════════════════════════════════════

/** Category display labels */
export const CATEGORY_LABELS: Record<OriginCategory, string> = {
  battlepass: 'Battle Pass',
  pro_pack: 'Pro Pack',
  event: 'Event',
  ranked: 'Ranked',
};

/** Category badge colors (CSS variable names) */
export const CATEGORY_COLORS: Record<OriginCategory, { text: string; bg: string }> = {
  battlepass: { text: 'var(--gs-lime)', bg: 'var(--gs-lime)' },
  pro_pack: { text: 'var(--gs-purple-bright, #8B7AFF)', bg: 'var(--gs-purple, #6D5BFF)' },
  event: { text: '#22d3ee', bg: '#22d3ee' },
  ranked: { text: '#F59E0B', bg: '#F59E0B' },
};

// ════════════════════════════════════════════════════════════════
// Index Builder (with validation)
// ════════════════════════════════════════════════════════════════

/** Release lookup by id */
const releaseById = new Map<string, ItemRelease>();
for (const r of RELEASES) {
  if (releaseById.has(r.id)) {
    throw new Error(`[itemOrigins] Duplicate release id: "${r.id}"`);
  }
  releaseById.set(r.id, r);
}

/** Pre-built case-insensitive index: lowercase item name (or name::quality) → release */
const itemIndex = new Map<string, ItemRelease>();
for (const [name, releaseId] of ITEM_REGISTRY) {
  const release = releaseById.get(releaseId);
  if (!release) {
    throw new Error(`[itemOrigins] Item "${name}" references unknown release id: "${releaseId}"`);
  }
  itemIndex.set(name.toLowerCase(), release);
}

/** Pre-resolved pattern rules */
const normalizedRules: ReadonlyArray<{ type: 'prefix' | 'contains'; pattern: string; release: ItemRelease }> = MATCH_RULES.map(rule => {
  const release = releaseById.get(rule.releaseId);
  if (!release) {
    throw new Error(`[itemOrigins] Match rule "${rule.pattern}" references unknown release id: "${rule.releaseId}"`);
  }
  return { type: rule.type, pattern: rule.pattern.toLowerCase(), release };
});

// ════════════════════════════════════════════════════════════════
// Lookup Function
// ════════════════════════════════════════════════════════════════

/**
 * Look up the origin release for an NFT by its name.
 * Optionally pass quality for multi-quality disambiguation (guns/legs/arms).
 * Returns null if the item isn't in any known release.
 */
export function getItemOrigin(itemName: string, quality?: string): ItemRelease | null {
  const lower = itemName.toLowerCase();

  // 1. Composite key: name::quality (for multi-quality items)
  if (quality) {
    const composite = itemIndex.get(`${lower}::${quality.toLowerCase()}`);
    if (composite) return composite;
  }

  // 2. Exact name match
  const exact = itemIndex.get(lower);
  if (exact) return exact;

  // 3. Pattern rules (prefix, contains)
  for (const rule of normalizedRules) {
    if (rule.type === 'prefix' && lower.startsWith(rule.pattern)) return rule.release;
    if (rule.type === 'contains' && lower.includes(rule.pattern)) return rule.release;
  }

  return null;
}
