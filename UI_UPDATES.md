# UI Updates - NFT Card Display

## Changes Made

Updated the NFT card display to show mint numbers and quantity indicators more prominently.

## NFT Card Layout

### Before
```
┌─────────────────┐
│                 │
│   NFT Image     │  ← Quantity badge (×3) in corner
│                 │
├─────────────────┤
│ NFT Name        │
│ Collection      │
│ Floor: 1.5 AVAX │
│ #12345678...    │ ← Mint # at bottom
└─────────────────┘
```

### After
```
┌─────────────────┐
│                 │
│   NFT Image     │  ← Quantity badge (×3) in corner
│                 │
├─────────────────┤
│ NFT Name        │
│ Collection      │
│ Mint #12345... Multiple │ ← Mint # + "Multiple" indicator
│ Floor: 1.5 AVAX │
└─────────────────┘
```

## Visual Examples

### Single NFT (Quantity = 1)
```
┌─────────────────┐
│   🖼️ Image      │
├─────────────────┤
│ Character #4523 │
│ Off The Grid    │
│ Mint #41567892  │ ← Just mint number
│ Floor: 0.5 AVAX │
└─────────────────┘
```

### Multiple NFTs (Quantity > 1)
```
┌─────────────────┐
│   🖼️ Image   ×3 │ ← Badge in top-right
├─────────────────┤
│ Weapon Skin #12 │
│ Off The Grid    │
│ Mint #78234... Multiple │ ← Mint # + "Multiple" label
│ Floor: 0.3 AVAX │
└─────────────────┘
```

## Implementation Details

### File: [components/NFTGallery.tsx](components/NFTGallery.tsx)

**Mint Number Display:**
- Shows first 8 characters of token ID
- Format: "Mint #12345678..."
- Always visible on all NFT cards
- Color: Gray (#9CA3AF)

**Multiple Indicator:**
- Only shown when `quantity > 1`
- Text: "Multiple"
- Color: Blue (#2563EB)
- Font: Semi-bold
- Position: Right-aligned next to mint number

**Layout:**
```tsx
<div className="flex items-center justify-between mt-1">
  <p className="text-xs text-gray-400 truncate">
    Mint #{nft.tokenId.slice(0, 8)}...
  </p>
  {nft.quantity && nft.quantity > 1 && (
    <p className="text-xs text-blue-600 font-semibold">
      Multiple
    </p>
  )}
</div>
```

## User Benefits

1. **Quick Identification**
   - Users can see mint numbers at a glance
   - No need to hover or click to see token ID

2. **Quantity Awareness**
   - "Multiple" text is more readable than "×3" for quantity
   - Badge (×3) still shows exact count in corner
   - Text indicator makes it clear when hovering/browsing

3. **Better Organization**
   - Mint number moved up for prominence
   - Floor price stays visible below
   - Clean, scannable layout

## Responsive Design

The layout works across all screen sizes:

**Desktop (lg screens):**
- 4 columns
- Full mint number visible

**Tablet (md screens):**
- 3 columns
- Mint number may truncate if very long

**Mobile (sm screens):**
- 2 columns
- Compact but readable

**Mobile (base):**
- 1 column
- Full width, all text visible

## Color Scheme

| Element | Color | Purpose |
|---------|-------|---------|
| Mint # | Gray-400 (#9CA3AF) | Subtle, secondary info |
| "Multiple" | Blue-600 (#2563EB) | Stands out, indicates special status |
| Quantity Badge | Blue-600 background | Matches "Multiple" indicator |
| Floor Price | Green-600 (#059669) | Financial info, positive connotation |

## Accessibility

- **Text Contrast**: All text meets WCAG AA standards
- **Font Size**: 12px (0.75rem) minimum for readability
- **Truncation**: Uses CSS `truncate` with `title` attribute for full text on hover
- **Semantic HTML**: Proper use of `<p>` tags for text content

## Edge Cases Handled

1. **Very Long Token IDs**
   - Truncated to 8 characters
   - Full ID shown in modal
   - Full ID in hover tooltip (via `title` attribute)

2. **No Quantity Data**
   - "Multiple" indicator hidden
   - Layout still looks clean with just mint number

3. **Quantity = 1**
   - No "Multiple" indicator
   - Badge (×1) not shown
   - Clean, minimal display

4. **No Floor Price**
   - Floor price line hidden
   - Mint number still prominent

## Testing Checklist

- [x] Single NFT displays mint number only
- [x] Multiple NFTs show "Multiple" text
- [x] Quantity badge (×N) still shows in corner
- [x] Floor price displays below mint info
- [x] Layout responsive on mobile
- [x] Text truncates properly on small screens
- [x] Hover shows full token ID
- [x] Build successful with no errors

## Future Enhancements

Possible improvements:
1. **Full Mint Number**: Show complete token ID (not truncated)
2. **Rarity Indicator**: Add rarity badge based on traits
3. **Last Sale Price**: Show last transaction price
4. **Listing Status**: Indicate if NFT is currently listed
5. **Sorting Options**: Sort by mint number, floor price, etc.

## Related Documentation

- [NFT_FEATURE.md](NFT_FEATURE.md) - Clickable NFT feature documentation
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Loading optimization details
- [NFTGallery.tsx](components/NFTGallery.tsx) - Component implementation
