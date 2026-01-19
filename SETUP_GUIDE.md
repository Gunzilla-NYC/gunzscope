# Complete Setup Guide

## What You Need Before Starting

1. **GUN Token Contract Addresses**
   - Avalanche C-Chain contract address
   - Solana token mint address

2. **NFT Collection Addresses** (if applicable)
   - Avalanche NFT collection contract
   - Solana NFT collection address

3. **API Keys** (optional but recommended)
   - OpenSea API key
   - CoinGecko API key
   - In-game marketplace API credentials

---

## Step-by-Step Setup

### 1. Install Dependencies

Open terminal in the project directory:

```bash
cd X:\Projects\GUNZILLA\gun-token-tracker
npm install
```

This installs all required packages:
- Next.js, React, TypeScript
- Ethers.js (for Avalanche)
- Solana Web3.js (for Solana)
- Axios (for API calls)

### 2. Configure Environment Variables

Open `.env.local` file and fill in your values:

```env
# ==================================
# BLOCKCHAIN RPC ENDPOINTS
# ==================================
# You can use public RPCs or get dedicated endpoints from:
# - Alchemy: https://www.alchemy.com/
# - Infura: https://infura.io/
# - QuickNode: https://www.quicknode.com/

NEXT_PUBLIC_AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# ==================================
# GUN TOKEN CONTRACT ADDRESSES
# ==================================
# REQUIRED: Get these from your token deployment or block explorer

# Avalanche (C-Chain) - ERC-20 format
# Find on: https://snowtrace.io/
NEXT_PUBLIC_GUN_TOKEN_AVALANCHE=0xYourAvalancheContractAddress

# Solana - SPL Token format
# Find on: https://solscan.io/
NEXT_PUBLIC_GUN_TOKEN_SOLANA=YourSolanaTokenMintAddress

# ==================================
# NFT COLLECTION ADDRESSES
# ==================================
# Optional: Add if you want to display NFTs

NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE=0xYourNFTContractAddress
NEXT_PUBLIC_NFT_COLLECTION_SOLANA=YourNFTCollectionAddress

# ==================================
# API KEYS
# ==================================
# Optional: For better rate limits and additional features

# OpenSea API - Get from: https://docs.opensea.io/reference/api-keys
NEXT_PUBLIC_OPENSEA_API_KEY=your_opensea_api_key_here

# CoinGecko API - Get from: https://www.coingecko.com/en/api/pricing
COINGECKO_API_KEY=your_coingecko_api_key_here

# Alchemy (Optional) - For better RPC performance
ALCHEMY_API_KEY=your_alchemy_api_key_here

# ==================================
# IN-GAME MARKETPLACE
# ==================================
# Optional: Connect to your game's marketplace API

NEXT_PUBLIC_GAME_MARKETPLACE_API=https://api.yourgame.com
GAME_MARKETPLACE_API_KEY=your_game_api_key_here
```

### 3. Find Your Contract Addresses

#### For Avalanche GUN Token:

1. Open [Snowtrace.io](https://snowtrace.io/)
2. Search for "GUN" or your token name in the search bar
3. Click on the token result
4. Copy the **Contract Address** (format: `0x...`)
5. Paste into `NEXT_PUBLIC_GUN_TOKEN_AVALANCHE`

**Example**: `0x1234567890abcdef1234567890abcdef12345678`

#### For Solana GUN Token:

1. Open [Solscan.io](https://solscan.io/)
2. Search for your token
3. Look for **Token Mint Address** or **Token Address**
4. Copy the address (Base58 format)
5. Paste into `NEXT_PUBLIC_GUN_TOKEN_SOLANA`

**Example**: `GUNabcdefg123456789HIJKLMNOP123456789`

### 4. Get API Keys (Optional but Recommended)

#### OpenSea API Key:

1. Go to [OpenSea Developer Portal](https://docs.opensea.io/reference/api-keys)
2. Sign up / Log in
3. Request an API key (usually instant approval)
4. Copy the key to `NEXT_PUBLIC_OPENSEA_API_KEY`

**Why?** Better rate limits + access to NFT floor prices and sales data

#### CoinGecko API Key:

1. Go to [CoinGecko API](https://www.coingecko.com/en/api/pricing)
2. Sign up for free Demo plan
3. Copy API key to `COINGECKO_API_KEY`

**Why?** Better rate limits for price queries (free tier: 10,000 calls/month)

### 5. Test Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Test with a wallet address:**
- Avalanche wallet: `0x...` (42 characters)
- Solana wallet: Base58 string (32-44 characters)

### 6. Verify Everything Works

Check that you can see:
- ✓ GUN token balance on Avalanche
- ✓ GUN token balance on Solana
- ✓ NFTs from both chains
- ✓ Current GUN token price
- ✓ Portfolio summary with total value

If something doesn't work, check the browser console (F12) for errors.

---

## Common Issues & Solutions

### Issue: "No GUN tokens found"

**Possible causes:**
- Contract address is incorrect
- Wallet doesn't hold any tokens
- RPC endpoint is down

**Solutions:**
1. Double-check contract address in `.env.local`
2. Verify wallet holds tokens on block explorer
3. Try a different RPC endpoint

### Issue: "Failed to fetch wallet data"

**Possible causes:**
- Invalid wallet address format
- Network/RPC issues
- Contract address not set

**Solutions:**
1. Verify wallet address format matches the chain
2. Check internet connection
3. Ensure contract addresses are set in `.env.local`

### Issue: NFTs not displaying

**Possible causes:**
- NFT collection address not set
- IPFS gateway timeout
- Metadata issues

**Solutions:**
1. Set `NEXT_PUBLIC_NFT_COLLECTION_*` addresses
2. Wait and retry (IPFS can be slow)
3. Check browser console for specific errors

### Issue: Price shows as "N/A"

**Possible causes:**
- GUN token not listed on CoinGecko
- API rate limit reached
- CoinGecko token ID incorrect

**Solutions:**
1. Add CoinGecko API key
2. Update the token ID in `lib/api/coingecko.ts`
3. Use alternative price source (DEX price oracle)

---

## Testing with Real Data

### Example Wallet Addresses (for testing):

**Note**: These are example formats. Use real wallet addresses that hold GUN tokens.

**Avalanche format:**
```
0x1234567890123456789012345678901234567890
```

**Solana format:**
```
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

## Performance Optimization

### Use Dedicated RPC Endpoints (Recommended for Production)

Free public RPCs can be slow or rate-limited. For better performance:

1. **Alchemy** (Recommended):
   - Sign up at [alchemy.com](https://www.alchemy.com/)
   - Create an Avalanche app
   - Replace `NEXT_PUBLIC_AVALANCHE_RPC_URL` with Alchemy endpoint
   - Example: `https://avax-mainnet.g.alchemy.com/v2/YOUR_KEY`

2. **QuickNode** (Alternative):
   - Sign up at [quicknode.com](https://www.quicknode.com/)
   - Get endpoints for both Avalanche and Solana

### Benefits:
- Faster response times
- Higher rate limits
- Better reliability
- Detailed analytics

---

## What's Next?

Once your local setup is working:

1. **Deploy to Vercel** → See [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Customize the UI** → Edit components in `/components`
3. **Add more features** → Extend blockchain services in `/lib`
4. **Set up custom domain** → Via Vercel dashboard

---

## File Structure Reference

```
gun-token-tracker/
├── .env.local              ← YOUR CONFIGURATION (edit this!)
├── app/
│   └── page.tsx            ← Main page UI
├── components/             ← React components
│   ├── WalletInput.tsx
│   ├── PortfolioSummary.tsx
│   ├── TokenBalance.tsx
│   ├── NFTGallery.tsx
│   └── MarketplaceStats.tsx
├── lib/
│   ├── types.ts            ← TypeScript types
│   ├── blockchain/         ← Blockchain integrations
│   │   ├── avalanche.ts    ← Modify for Avalanche changes
│   │   └── solana.ts       ← Modify for Solana changes
│   └── api/                ← External APIs
│       ├── coingecko.ts    ← Price data
│       ├── opensea.ts      ← NFT data
│       └── marketplace.ts  ← Game marketplace
```

---

## Need Help?

1. Check the [README.md](./README.md) for general documentation
2. Review the [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guide
3. Look at code comments in source files
4. Check browser console (F12) for error messages

---

**You're all set!** Start the dev server and begin tracking your GUN tokens! 🎮🚀
