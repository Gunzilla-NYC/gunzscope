# Progressive Accounts

Zero-signup account system that persists user data via wallet connection.

## Overview

Progressive accounts allow users to:
- Browse anonymously by pasting wallet addresses (no account required)
- Connect a wallet via Dynamic to unlock persistence features
- Save favorites, track addresses, and sync settings across devices

## Architecture

### Identity Model

- **Primary identity**: Dynamic user ID (from JWT)
- **No email/password auth**: Wallet connection is the only authentication
- **Automatic profile creation**: On first authenticated API call

### Database Schema (Prisma + SQLite)

```
UserProfile (1) ─┬─ (N) Wallet
                 ├─ (N) TrackedAddress
                 ├─ (N) FavoriteItem
                 └─ (1) UserSettings
```

### Authentication Flow

1. User connects wallet via Dynamic SDK
2. Dynamic issues JWT with user ID and wallet info
3. Client includes JWT in API requests as `Authorization: Bearer <token>`
4. Server verifies JWT via Dynamic's JWKS endpoint
5. Profile created/updated on first authenticated request

## API Routes

All routes require `Authorization: Bearer <dynamic_jwt>` header.

### GET /api/me

Returns current user's complete profile.

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "clx...",
    "dynamicUserId": "...",
    "email": null,
    "displayName": null,
    "wallets": [...],
    "trackedAddresses": [...],
    "favorites": [...],
    "settings": {...}
  }
}
```

### POST /api/me/email

Set user's email (optional, no verification).

**Body:**
```json
{ "email": "user@example.com" }
```

### POST /api/tracked-addresses

Add an address to track.

**Body:**
```json
{
  "address": "0x...",
  "label": "My friend's wallet",
  "chain": "avalanche"
}
```

### DELETE /api/tracked-addresses/:id

Remove a tracked address.

### POST /api/favorites

Add a favorite item.

**Body:**
```json
{
  "type": "nft",
  "refId": "0xcontract:tokenId",
  "metadata": { "name": "Cool NFT", "image": "..." }
}
```

Valid types: `weapon`, `nft`, `attachment`, `skin`, `collection`

### DELETE /api/favorites/:id

Remove a favorite.

### PATCH /api/settings

Merge settings with existing values.

**Body:**
```json
{
  "defaultAddress": "0x...",
  "compactView": true
}
```

### GET /api/settings

Get current settings.

## Client Integration

### useUserProfile Hook

```tsx
import { useUserProfile } from '@/lib/hooks/useUserProfile';

function MyComponent() {
  const {
    profile,
    isLoading,
    isConnected,
    addTrackedAddress,
    removeTrackedAddress,
    addFavorite,
    removeFavorite,
    isFavorited,
    updateSettings,
  } = useUserProfile();

  // Check if item is favorited
  const saved = isFavorited('nft', '0x...:123');

  // Add to favorites
  await addFavorite('nft', '0x...:123', { name: 'My NFT' });
}
```

### FavoriteButton Component

```tsx
import FavoriteButton from '@/components/FavoriteButton';

<FavoriteButton
  type="nft"
  refId={`${contractAddress}:${tokenId}`}
  metadata={{ name: nft.name, image: nft.image }}
/>
```

### TrackAddressButton Component

```tsx
import TrackAddressButton from '@/components/TrackAddressButton';

<TrackAddressButton
  address="0x..."
  label="My wallet"
  variant="button"
/>
```

### AccountPanel Component

Slide-out panel showing tracked addresses, favorites, and settings.
Accessible via wallet dropdown menu → "Saved Items".

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Database Commands

```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration_name
```

## Testing API Endpoints

### Get auth token (from browser console when connected)

```javascript
// In browser console while connected via Dynamic
const token = await window.dynamic.authToken;
console.log(token);
```

### Test with curl

```bash
# Get profile
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:3000/api/me

# Add tracked address
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123...","label":"Test wallet"}' \
  http://localhost:3000/api/tracked-addresses

# Add favorite
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"nft","refId":"0xabc:123","metadata":{"name":"Cool NFT"}}' \
  http://localhost:3000/api/favorites

# Update settings
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"compactView":true}' \
  http://localhost:3000/api/settings
```

## Production Deployment

### Database Migration

For production, switch to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```

2. Update `prisma.config.ts`:
   ```typescript
   datasource: {
     url: process.env.DATABASE_URL,
   }
   ```

3. Set environment variable:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Security Considerations

- JWT verification via Dynamic's JWKS endpoint
- All API routes check user ownership before data access
- Addresses normalized to lowercase for consistent matching
- No sensitive data exposed to client

## File Structure

```
lib/
├── auth/
│   └── dynamicAuth.ts      # JWT verification
├── db.ts                   # Prisma client singleton
├── hooks/
│   └── useUserProfile.ts   # Client-side profile hook
├── services/
│   └── userService.ts      # Database operations
├── generated/
│   └── prisma/             # Generated Prisma client

app/api/
├── me/
│   ├── route.ts            # GET /api/me
│   └── email/
│       └── route.ts        # POST /api/me/email
├── tracked-addresses/
│   ├── route.ts            # POST /api/tracked-addresses
│   └── [id]/
│       └── route.ts        # DELETE /api/tracked-addresses/:id
├── favorites/
│   ├── route.ts            # POST /api/favorites
│   └── [id]/
│       └── route.ts        # DELETE /api/favorites/:id
└── settings/
    └── route.ts            # GET, PATCH /api/settings

components/
├── AccountPanel.tsx        # Saved items panel
├── ConnectPromptModal.tsx  # "Connect to save" modal
├── FavoriteButton.tsx      # Heart button for favorites
└── TrackAddressButton.tsx  # Track address button

prisma/
├── schema.prisma           # Database schema
├── migrations/             # Migration history
└── dev.db                  # SQLite database (local)
```
