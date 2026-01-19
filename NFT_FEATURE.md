# Clickable NFT Feature - Implementation Guide

## Overview

NFTs in the GUN Token Tracker are now fully interactive! Users can click on any NFT to view detailed information including quantity owned, purchase history, current market listings, and performance metrics.

## Features Implemented

### 1. **Clickable NFT Cards**
- All NFT cards in the gallery are now clickable
- Hover effects (scale animation, shadow) indicate interactivity
- Clicking opens a detailed modal view

### 2. **Quantity Badges**
- NFTs owned in multiple copies display a blue badge (e.g., "×3")
- Badge appears in the top-right corner of the NFT image
- Works with both ERC-721 and ERC-1155 standards

### 3. **NFT Detail Modal**
The modal displays comprehensive information:

#### Basic Information
- NFT name and collection
- Token ID
- Blockchain (Avalanche/Solana)
- High-resolution image

#### Purchase Information
- **Original Purchase Price**: Extracted from blockchain transaction value
- **Purchase Date**: Date when the NFT was first transferred to the wallet
- Displayed in a highlighted section

#### Current Market Data
- **Floor Price**: Collection floor price
- **Ceiling Price**: Collection ceiling price
- **Lowest Current Listing**: Lowest active listing for this specific NFT
- **Highest Current Listing**: Highest active listing for this specific NFT

#### Performance Metrics
- **Gain/Loss vs. Lowest Listing**: Percentage change from purchase price
- **Gain/Loss vs. Highest Listing**: Percentage change from purchase price
- Color-coded (green for gains, red for losses)

#### Traits/Attributes
- All NFT metadata attributes displayed in a grid
- Shows trait type and value

## Technical Implementation

### New Components

#### [NFTDetailModal.tsx](components/NFTDetailModal.tsx)
- Reusable modal component for displaying NFT details
- Handles keyboard navigation (ESC to close)
- Click outside to close
- Responsive design (mobile-friendly)
- Smooth animations

### Updated Components

#### [NFTGallery.tsx](components/NFTGallery.tsx)
- Added click handlers to NFT cards
- Integrated quantity badges
- State management for modal open/close
- Hover effects for better UX

### Enhanced Blockchain Services

#### [avalanche.ts](lib/blockchain/avalanche.ts)

**New Methods:**

1. **`getNFTTransferHistory()`**
   - Queries blockchain for Transfer events
   - Finds when the wallet first received the NFT
   - Extracts transaction value as purchase price
   - Gets block timestamp as purchase date
   - Looks back ~1 year of blocks

2. **`detectNFTQuantity()`**
   - Checks if NFT is ERC-1155 (multi-token)
   - Returns quantity owned
   - Falls back to 1 for ERC-721

**Updated ABIs:**
- Added Transfer event to ERC-721 ABI
- Added ERC-1155 ABI for multi-token support

#### [opensea.ts](lib/api/opensea.ts)

**New Methods:**

1. **`getNFTListings()`**
   - Fetches active listings for a specific NFT
   - Returns lowest and highest current listing prices
   - Used for market comparison

2. **`getNFTMetadata()`**
   - Fetches detailed NFT metadata from OpenSea
   - Gets traits, description, and other attributes

### Enhanced Data Flow

#### [page.tsx](app/page.tsx)

**New Function: `enrichNFTData()`**
- Takes basic NFT data from blockchain
- Enriches each NFT with:
  - Quantity owned
  - Purchase price and date
  - Current lowest listing
  - Current highest listing
- Runs enrichment in parallel for all NFTs
- Handles errors gracefully (returns basic NFT if enrichment fails)

**Updated Flow:**
1. Fetch basic NFT data from blockchain
2. Enrich with additional data (quantity, history, listings)
3. Display in gallery with interactive cards
4. Click to view full details in modal

## Data Sources

### Purchase History
- **Source**: Blockchain Transfer events
- **Method**: Query last 1 year of blocks for Transfer events to wallet
- **Price**: Transaction value in native token (AVAX/GUN)
- **Accuracy**: Approximate (assumes purchase price = transaction value)

### Quantity Detection
- **ERC-1155**: Calls `balanceOf(wallet, tokenId)` to get exact count
- **ERC-721**: Defaults to 1 (standard NFT)

### Current Listings
- **Source**: OpenSea API v2
- **Endpoint**: `/orders/{chain}/{contract}/{tokenId}`
- **Data**: All active listings for the specific NFT
- **Calculation**: Min/Max of all listing prices

## User Experience

### Visual Indicators
1. **Quantity Badge**: Blue circle with "×N" in top-right of NFT image
2. **Hover Effect**: Card scales up and shows shadow
3. **Cursor**: Pointer cursor on NFT cards
4. **Performance Colors**: Green for gains, red for losses

### Modal Interaction
- **Open**: Click any NFT card
- **Close**:
  - Click the X button
  - Press ESC key
  - Click outside the modal
- **Scroll**: Modal content is scrollable on mobile

## Edge Cases Handled

1. **No Purchase History**: If transfer events not found, purchase info shows "N/A"
2. **No Listings**: If no active listings, shows "N/A"
3. **ERC-721 vs ERC-1155**: Auto-detects token standard
4. **API Failures**: Gracefully falls back to basic NFT data
5. **Missing Metadata**: Shows placeholder text when data unavailable

## Performance Considerations

### Parallel Processing
- All NFT enrichment happens in parallel using `Promise.all()`
- Each NFT's data (quantity, history, listings) fetched concurrently

### Error Handling
- Individual NFT enrichment failures don't block other NFTs
- Failed enrichments return basic NFT data
- Errors logged to console for debugging

### Blockchain Query Optimization
- Transfer event queries limited to last 1 year (~15.7M blocks)
- Uses indexed event filters for faster queries
- Falls back gracefully if RPC doesn't support event queries

## Configuration

### Environment Variables Required

```env
# NFT Collection Contract (required for enrichment)
NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE=0x9ed98e159be43a8d42b64053831fcae5e4d7d271

# OpenSea API Key (required for listing data)
NEXT_PUBLIC_OPENSEA_API_KEY=your_opensea_api_key
```

### Block Lookback Period
Currently set to ~1 year. To adjust:

```typescript
// In lib/blockchain/avalanche.ts
const blocksPerYear = Math.floor((365 * 24 * 60 * 60) / 2); // Assumes 2 sec blocks
```

## Future Enhancements

Potential improvements:
1. **Caching**: Cache transfer history to reduce RPC calls
2. **Historical Charts**: Show price history over time
3. **Multiple Wallets**: Compare NFT holdings across wallets
4. **Rarity Score**: Display rarity ranking based on traits
5. **Quick Actions**: "List on OpenSea" or "View on Explorer" buttons
6. **Transaction Links**: Link to original purchase transaction
7. **Profit Calculator**: Calculate total profit/loss across portfolio

## Testing

### Test Scenarios

1. **Single NFT**: Wallet owns 1 copy of an NFT
   - ✓ No quantity badge shown
   - ✓ Click opens modal with details

2. **Multiple Copies**: Wallet owns 3+ copies of same NFT
   - ✓ Quantity badge shows "×3"
   - ✓ Modal displays quantity information

3. **With Purchase History**: NFT purchased via marketplace
   - ✓ Purchase price shown in AVAX
   - ✓ Purchase date displayed
   - ✓ Gain/loss percentages calculated

4. **No Listings**: NFT has no active market listings
   - ✓ Shows "N/A" for listing prices
   - ✓ Performance metrics show "N/A"

5. **Mobile View**: Test on small screens
   - ✓ Modal is scrollable
   - ✓ Grid adjusts to single column
   - ✓ Touch interactions work

### Test Wallet
Use the test wallet from documentation:
```
0xF9434E3057432032bB621AA5144329861869c72F
```

This wallet has 19 NFTs from the "Off The Grid" collection.

## Troubleshooting

### Issue: Quantity always shows 1
- **Cause**: Collection uses ERC-721, not ERC-1155
- **Solution**: This is expected behavior for standard NFTs

### Issue: Purchase price shows "N/A"
- **Cause**:
  1. NFT was minted (not purchased)
  2. Transfer happened >1 year ago
  3. RPC doesn't support event queries
- **Solution**: Increase block lookback period or use archive node

### Issue: No current listings shown
- **Cause**:
  1. NFT not listed on OpenSea
  2. OpenSea API key missing
  3. API rate limiting
- **Solution**:
  1. This is normal if NFT isn't listed
  2. Add `NEXT_PUBLIC_OPENSEA_API_KEY` to `.env.local`
  3. Wait and retry

### Issue: Modal doesn't close on mobile
- **Cause**: Touch event not registered
- **Solution**: Already handled - tap outside or use close button

## API Usage

### OpenSea API Calls
Per wallet lookup with N NFTs:
- **Listings**: N calls (one per NFT)
- **Rate Limit**: 2 requests/second on free tier
- **Mitigation**: Calls are parallel but browser limits concurrent requests

### RPC Calls
Per wallet lookup with N NFTs:
- **Transfer Events**: N calls (one per NFT)
- **ERC-1155 Check**: N calls (one per NFT)
- **Total**: ~2N calls to blockchain
- **Mitigation**: Uses cached provider, parallel execution

## Code References

### Key Files
- [NFTDetailModal.tsx:1-254](components/NFTDetailModal.tsx#L1-L254) - Modal component
- [NFTGallery.tsx:1-107](components/NFTGallery.tsx#L1-L107) - Gallery with click handlers
- [avalanche.ts:152-217](lib/blockchain/avalanche.ts#L152-L217) - Transfer history & quantity
- [opensea.ts:93-153](lib/api/opensea.ts#L93-L153) - Listing data
- [page.tsx:24-60](app/page.tsx#L24-L60) - Data enrichment logic
- [types.ts:8-22](lib/types.ts#L8-L22) - Extended NFT interface

## Summary

The clickable NFT feature provides users with comprehensive insights into their NFT holdings, including:
- ✓ Quantity ownership tracking
- ✓ Historical purchase data
- ✓ Current market listings
- ✓ Performance analytics (gain/loss)
- ✓ Detailed metadata and traits

All data is fetched in real-time from blockchain and OpenSea API, ensuring accuracy and freshness.
