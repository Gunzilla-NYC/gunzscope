# NFT Grouping Feature

## Overview

The GUN Token Tracker now automatically groups duplicate NFTs to provide a cleaner, more intuitive display. When a wallet owns multiple copies of the same item (same metadata but different token IDs), they are consolidated into a single card showing the total quantity.

## Problem Solved

Previously, if you owned 2 copies of the same NFT with different token IDs (e.g., #1552957 and #4525639), they would display as two separate cards. This made it:
- Harder to see at a glance how many unique items you own
- More cluttered when you have multiple copies of popular items
- Difficult to understand your actual NFT collection diversity

## How It Works

### Grouping Logic

NFTs are grouped based on their **metadata signature**:
- **Name**: NFT name
- **Image**: NFT image URL
- **Traits**: All attributes/traits (excluding unique identifiers)

**Excluded from Grouping:**
The following traits are considered unique identifiers and are excluded from grouping:
- Serial Number (any variation)
- Token ID
- Mint Number
- Edition
- ID

This means two "Prankster Shorts" with Serial Number 348 and 567 will be grouped together, since everything else is the same.

**Example**:
```
NFT 1: Name="Prankster Shorts", Image="ipfs://abc123", Traits={rarity: "Epic", serialNumber: "348"}
NFT 2: Name="Prankster Shorts", Image="ipfs://abc123", Traits={rarity: "Epic", serialNumber: "567"}
→ GROUPED (same name, image, rarity - serial number ignored)

NFT 3: Name="Prankster Shorts", Image="ipfs://abc123", Traits={rarity: "Rare", serialNumber: "100"}
→ SEPARATE (different rarity trait)
```

### Implementation

**File**: [lib/utils/nftGrouping.ts](lib/utils/nftGrouping.ts)

```typescript
export function groupNFTsByMetadata(nfts: NFT[]): NFT[] {
  // Groups NFTs by metadata signature
  // Returns consolidated array with quantity set correctly
}
```

**Data Structure**:
```typescript
interface NFT {
  tokenId: string;        // Primary token ID (first one)
  tokenIds?: string[];    // All token IDs if grouped
  quantity?: number;      // Number of copies
  // ... other fields
}
```

## Visual Display

### Gallery View

**Single NFT**:
```
┌─────────────────┐
│   🖼️ Image      │
├─────────────────┤
│ Character #4523 │
│ Off The Grid    │
│ Mint #41567892  │
│ Floor: 0.5 AVAX │
└─────────────────┘
```

**Multiple Copies** (Grouped):
```
┌─────────────────┐
│   🖼️ Image   ×3 │ ← Quantity badge
├─────────────────┤
│ Weapon Skin     │
│ Off The Grid    │
│ Mint #1552... Multiple │ ← "Multiple" indicator
│ Floor: 0.3 AVAX │
└─────────────────┘
```

### Modal/Detail View

When you click on a grouped NFT, the modal shows:

**Quantity Indicator**:
```
┌────────────────────────────┐
│ 📦 You own 3 copies        │
└────────────────────────────┘
```

**All Token IDs**:
```
Token IDs (3):
┌──────────┐ ┌──────────┐ ┌──────────┐
│ #1552957 │ │ #4525639 │ │ #7891234 │
└──────────┘ └──────────┘ └──────────┘
```

## Integration

### In app/page.tsx

Grouping happens immediately after fetching NFTs:

```typescript
// Fetch NFTs from blockchain
const avalancheNFTsRaw = await avalancheService.getNFTs(address);
const solanaNFTs = await solanaService.getNFTs(address);

// Group duplicates
const groupedAvalancheNFTs = groupNFTsByMetadata(avalancheNFTsRaw);
const groupedSolanaNFTs = groupNFTsByMetadata(solanaNFTs);

// Continue with enrichment and display...
```

### In NFTGallery Component

The gallery already handles quantity display:
- **×N badge** in top-right corner of image
- **"Multiple" text** below mint number
- No code changes needed

### In NFTDetailModal Component

The modal shows grouped token IDs:
- Lists all token IDs when `tokenIds.length > 1`
- Displays them as chips/badges
- Shows total count

## Example Walkthrough

### Scenario: Wallet with 2 identical items

**Wallet**: `0xF9434E3057432032bB621AA5144329861869c72F`

**NFTs Owned**:
1. Token ID: #1552957 - "Prankster Shorts" (rarity: Epic, serial: 348, class: Customization Item)
2. Token ID: #4525639 - "Prankster Shorts" (rarity: Epic, serial: 567, class: Customization Item)

**Before Grouping**:
- Shows 2 separate cards
- Both display the same image and name
- User sees: "2 NFTs"

**After Grouping**:
- Shows 1 card with ×2 badge
- Card displays: "Mint #1552... Multiple"
- User sees: "1 NFT" (but knows they own 2 copies)

**In Modal**:
```
Prankster Shorts
GUN NFT Collection

📦 You own 2 copies

Token IDs (2):
┌──────────┐ ┌──────────┐
│ #1552957 │ │ #4525639 │
└──────────┘ └──────────┘

Chain: avalanche

Traits:
- Platform: PC
- Class: Customization Item
- Rarity: Epic
- Item Type: None
- Customization Type: Legwear

(Note: Serial numbers are not shown in grouped view)
```

## Edge Cases

### 1. ERC-1155 Tokens
- ERC-1155 tokens naturally support quantity
- Grouping logic works alongside ERC-1155 quantity detection
- If an ERC-1155 shows quantity=3, it's ONE token with 3 units
- If grouping finds 2 ERC-721s, it shows quantity=2 (two separate tokens)

### 2. Similar but Not Identical NFTs
NFTs with different traits are NOT grouped:
```
NFT A: "Weapon" (rarity: common)
NFT B: "Weapon" (rarity: rare)
→ SEPARATE items (different trait)
```

### 3. Metadata Variations
Small differences prevent grouping:
- Different image URLs
- Different trait values
- Different names (even capitalization)

### 4. No Metadata
NFTs without metadata are never grouped (each treated as unique).

## Performance Impact

### Before Grouping
- Display 100 NFTs → Show 100 cards
- Cluttered gallery
- Harder to navigate

### After Grouping
- Own 100 NFT tokens, but only 30 unique items
- Display 30 NFTs → Show 30 cards
- Cleaner, faster rendering
- Better UX

## Benefits

1. **Cleaner UI**
   - Fewer cards to scroll through
   - Easier to see collection diversity

2. **Better Understanding**
   - Immediately see which items you have multiples of
   - Understand collection composition

3. **Accurate Count**
   - **Portfolio Summary** shows total NFT holdings (including quantities)
   - **Gallery header** shows unique items
   - **×N badge** on each card shows exact quantity of that item

4. **Detailed Information**
   - Modal reveals all token IDs
   - Transparency maintained

## Configuration

No configuration needed - grouping is automatic!

To disable grouping (if ever needed):
```typescript
// In app/page.tsx, skip the grouping step:
const avalancheNFTs = await enrichNFTData(
  avalancheNFTsRaw, // Use raw instead of grouped
  address,
  avalancheService
);
```

## Technical Details

### Metadata Key Generation

The grouping key is created as:
```
key = "{name}::{image}::{sorted_traits}"
```

**Example**:
```
name: "Cyberpunk Jacket"
image: "ipfs://Qm123abc..."
traits: {rarity: "common", type: "clothing"}

key = "Cyberpunk Jacket::ipfs://Qm123abc...::rarity:common|type:clothing"
```

### Data Consolidation

When multiple NFTs share a key:
```typescript
{
  tokenId: "1552957",           // First token ID
  tokenIds: ["1552957", "4525639"], // All token IDs
  quantity: 2,                   // Count
  name: "Cyberpunk Jacket",
  image: "ipfs://...",
  // ... other metadata from first NFT
}
```

## Testing

### Manual Test

1. Find a wallet with duplicate NFTs:
   ```
   0xF9434E3057432032bB621AA5144329861869c72F
   ```

2. Enter wallet address in tracker

3. Check results:
   - Gallery should show 1 card (not 2)
   - Card should have ×2 badge
   - "Multiple" text below mint number

4. Click NFT card

5. Modal should show:
   - "You own 2 copies"
   - Both token IDs listed

### Automated Test (Future)

```typescript
describe('NFT Grouping', () => {
  it('groups NFTs with same metadata', () => {
    const nfts = [
      { tokenId: '1', name: 'Item', image: 'img1', traits: {} },
      { tokenId: '2', name: 'Item', image: 'img1', traits: {} },
    ];

    const grouped = groupNFTsByMetadata(nfts);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].quantity).toBe(2);
    expect(grouped[0].tokenIds).toEqual(['1', '2']);
  });

  it('keeps NFTs with different metadata separate', () => {
    const nfts = [
      { tokenId: '1', name: 'Item A', image: 'img1', traits: {} },
      { tokenId: '2', name: 'Item B', image: 'img2', traits: {} },
    ];

    const grouped = groupNFTsByMetadata(nfts);

    expect(grouped).toHaveLength(2);
  });
});
```

## Related Files

- [lib/utils/nftGrouping.ts](lib/utils/nftGrouping.ts) - Grouping logic
- [lib/types.ts](lib/types.ts) - NFT type definition
- [app/page.tsx](app/page.tsx) - Integration point
- [components/NFTGallery.tsx](components/NFTGallery.tsx) - Gallery display
- [components/NFTDetailModal.tsx](components/NFTDetailModal.tsx) - Modal with token IDs

## FAQ

**Q: Will grouping hide any information?**
A: No! All token IDs are preserved and shown in the detail modal.

**Q: What if I want to see each token separately?**
A: Click the grouped NFT - the modal shows all individual token IDs.

**Q: Does this work with ERC-1155?**
A: Yes! It works alongside ERC-1155's native quantity support.

**Q: Can I ungroup NFTs?**
A: Not currently, but all individual token IDs are accessible in the modal.

**Q: What if metadata changes?**
A: Grouping happens at fetch time. Refresh the page to regroup with updated metadata.

---

Built for cleaner NFT collection viewing! 🎮
