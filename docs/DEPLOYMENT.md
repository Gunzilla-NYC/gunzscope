# Deployment Guide for GUN Token Tracker

## Quick Start - Deploy to Vercel in 5 Minutes

### Step 1: Prepare Your Repository

1. Initialize Git (if not already done):
```bash
cd gun-token-tracker
git init
git add .
git commit -m "Initial commit: GUN Token Tracker"
```

2. Create a GitHub repository and push:
```bash
git remote add origin https://github.com/yourusername/gun-token-tracker.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

#### Option A: Web UI (Recommended for first-time users)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your `gun-token-tracker` repository
4. Vercel will auto-detect Next.js - no configuration needed
5. Click "Deploy"

#### Option B: Vercel CLI (For developers)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow the prompts)
vercel

# Or deploy directly to production
vercel --prod
```

### Step 3: Configure Environment Variables

**CRITICAL**: Your app won't work without these environment variables!

1. In Vercel dashboard, go to your project
2. Navigate to: **Settings → Environment Variables**
3. Add the following variables:

#### Required Variables:
```
NEXT_PUBLIC_GUN_TOKEN_AVALANCHE = 0xYourAvalancheContractAddress
NEXT_PUBLIC_GUN_TOKEN_SOLANA = YourSolanaTokenMintAddress
```

#### Recommended Variables:
```
NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE = 0xYourNFTContractAddress
NEXT_PUBLIC_NFT_COLLECTION_SOLANA = YourNFTCollectionAddress
NEXT_PUBLIC_OPENSEA_API_KEY = your_opensea_api_key
COINGECKO_API_KEY = your_coingecko_api_key
```

#### Optional (In-Game Marketplace):
```
NEXT_PUBLIC_GAME_MARKETPLACE_API = https://api.yourgame.com
GAME_MARKETPLACE_API_KEY = your_game_api_key
```

4. Make sure to select all three environments:
   - ✓ Production
   - ✓ Preview
   - ✓ Development

5. Click "Save"

### Step 4: Redeploy

After adding environment variables, trigger a redeployment:

1. Go to the "Deployments" tab
2. Click the three dots (•••) on the latest deployment
3. Click "Redeploy"

Or push a new commit:
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Step 5: Access Your Site

Your site will be live at: `https://your-project-name.vercel.app`

You can also add a custom domain in Vercel settings!

---

## Finding Your Contract Addresses

### For GUN Token on Avalanche:

1. Go to [Snowtrace.io](https://snowtrace.io/)
2. Search for "GUN token" or the token name
3. Copy the contract address (starts with `0x`)
4. Add to `NEXT_PUBLIC_GUN_TOKEN_AVALANCHE`

### For GUN Token on Solana:

1. Go to [Solscan.io](https://solscan.io/)
2. Search for your token
3. Copy the Token Mint Address
4. Add to `NEXT_PUBLIC_GUN_TOKEN_SOLANA`

### For NFT Collections:

Follow the same process, but search for your NFT collection instead.

---

## Getting API Keys

### OpenSea API Key (Recommended)

1. Visit: [docs.opensea.io/reference/api-keys](https://docs.opensea.io/reference/api-keys)
2. Sign up for free
3. Copy your API key
4. Add to `NEXT_PUBLIC_OPENSEA_API_KEY`

**Benefits**: Higher rate limits, access to floor prices and sales data

### CoinGecko API Key (Optional)

1. Visit: [coingecko.com/en/api/pricing](https://www.coingecko.com/en/api/pricing)
2. Free tier available (Demo plan)
3. Add to `COINGECKO_API_KEY`

**Benefits**: Better rate limits for price queries

---

## Troubleshooting Deployment

### Build Fails

**Error**: "Module not found"
```bash
# Solution: Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

**Error**: "Environment variable not found"
- Check that all required env vars are set in Vercel dashboard
- Make sure they're enabled for Production environment
- Redeploy after adding variables

### App Loads but Shows No Data

1. Check browser console (F12) for errors
2. Verify environment variables are set correctly in Vercel
3. Make sure contract addresses don't have extra spaces or quotes
4. Confirm wallet address format matches the chain

### API Rate Limits

If you're getting rate limited:
1. Add API keys (OpenSea, CoinGecko)
2. Consider upgrading to paid tiers for production use
3. Implement caching (future enhancement)

---

## Production Checklist

Before launching to users:

- [ ] All environment variables are set
- [ ] Contract addresses are verified and correct
- [ ] API keys are added (OpenSea, CoinGecko)
- [ ] Test with real wallet addresses
- [ ] Verify NFTs display correctly
- [ ] Check token balances are accurate
- [ ] Test on mobile devices
- [ ] Set up custom domain (optional)
- [ ] Add analytics (optional - Google Analytics, Vercel Analytics)

---

## Updating Your Deployment

### Making Changes

1. Edit your code locally
2. Test with `npm run dev`
3. Commit and push:
```bash
git add .
git commit -m "Description of changes"
git push
```

4. Vercel automatically deploys on push!

### Rolling Back

If something breaks:
1. Go to Vercel dashboard → Deployments
2. Find a working deployment
3. Click "Promote to Production"

---

## Performance Tips

1. **Use API Keys**: Prevents rate limiting
2. **Custom Domain**: Looks more professional
3. **Vercel Analytics**: Enable in project settings (free tier available)
4. **Edge Caching**: Vercel automatically caches at edge for better performance

---

## Security Best Practices

- ✓ Never commit `.env.local` to Git (already in .gitignore)
- ✓ Keep API keys secure in Vercel environment variables
- ✓ Don't expose private keys or sensitive data
- ✓ This app only reads blockchain data (no transactions)
- ✓ All API calls are client-side (transparent to users)

---

## Support & Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

---

**That's it!** Your GUN Token Tracker should now be live and tracking tokens across Avalanche and Solana! 🚀
