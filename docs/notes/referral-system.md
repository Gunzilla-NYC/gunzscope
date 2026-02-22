# Referral System Spec

## Architecture
- Wallet address = core referrer identifier, custom slugs for shareable URLs
- Share links: `gunzscope.xyz/r/{slug}`
- Three-stage funnel: `clicked` → `wallet_connected` → `portfolio_loaded`
- First-touch attribution — a wallet can only be referred once
- Database-first storage, planned migration to on-chain via merkle trees + claim contracts

## Database Tables
- `referrers`: wallet_address (unique), slug (unique), total_clicks, total_conversions
- `referral_events`: referrer_id (FK), referred_wallet, status, timestamps

## Anti-Fraud
- IP hash dedup (same IP + slug within 24h = 1 click)
- Self-referral blocked
- First-touch attribution (wallet already referred → ignored)
- Rate limit: 10 req/min per IP

## UI Integration
- Portfolio page: existing share dropdown uses referral URL when user has a slug
- Profile page: slug registration + stats dashboard
- Admin: `GET /api/admin/referrals` gated by `ADMIN_WALLETS` env var

## Slug Rules
- 3–20 chars, lowercase alphanumeric + hyphens
- No consecutive/leading/trailing hyphens
- Reserved: app, api, admin, portfolio, demo, wallet, ref, referral, gunzscope, gunz, null, undefined
