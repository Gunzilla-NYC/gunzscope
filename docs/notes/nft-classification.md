# NFT Classification System

Off The Grid items have THREE distinct classification systems — don't confuse them.

## 1. Quality (Cosmetic Tier)

Visual/cosmetic classification. Used for display badges on NFT cards.
**Gameplay impact**: Higher quality weapons have more attachment slots.

```typescript
const QUALITY_ORDER = {
  'Epic': 1,        // #cc44ff (purple) - most attachment slots
  'Rare': 2,        // #4488ff (blue)
  'Uncommon': 3,    // #44ff44 (green)
  'Common': 4,      // #888888 (gray) - fewest attachment slots
};
```

## 2. Rarity (Scarcity)

Determined by **total supply** — how many of that item exist. NOT the same as Quality.

- **Total supply**: An item with 150 total mints is rarer than one with 10,000 mints
- **Mint number** (e.g., "#370"): The sequence in which it was minted, NOT a rarity indicator
  - A #100 mint could be scarce (if only 150 exist) or plentiful (if 10,000 exist)
  - Lower mint numbers are perceived as more desirable by collectors
  - Does NOT affect gameplay stats or abilities
  - May command a premium on secondary markets (especially #1, low numbers)

## 3. Functional Tier (Gameplay Performance)

Affects in-game stats and performance. Stored in `metadata.type_spec.rarity` field.

```typescript
const FUNCTIONAL_TIER_ORDER = {
  'Classified': 1,  // Locked - cannot be modified at all
  'Premium': 2,     // Maps to Epic quality
  'Elite': 3,       // Maps to Rare quality
  'Refined': 4,     // Maps to Uncommon quality
  'Standard': 5,    // Maps to Common quality
};
```

**Classified** weapons are special/promotional items (e.g., Solana Vulture, Kestrel Punisher) — completely locked, cannot change attachments or skins.

**Important**: The metadata field is confusingly named `rarity` but contains Functional Tier, not Rarity or Quality.

## Ordering
- NFT Quality ordering: Epic > Rare > Uncommon > Common
