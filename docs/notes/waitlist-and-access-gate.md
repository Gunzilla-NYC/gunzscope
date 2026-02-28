# Waitlist & Access Gate System

## Access Flow

1. **Wallet connect** (Dynamic SDK or paste-address): `POST /api/access/validate` with `{ address }`
2. **Email sign-in** (Dynamic SDK): `POST /api/access/validate` with `{ email }`
3. Whitelisted → redirect to `/portfolio`
4. Not whitelisted → auto-join waitlist, redirect to `/waitlist`

## Email Identifiers

Emails are stored as `email:user@example.com` in the same `address` field as wallet addresses. The `email:` prefix distinguishes them. `deriveAutoSlug` in `referralService.ts` handles email identifiers by extracting the username before `@`.

## Wallet-Email Reconciliation

When a promoted email user connects a wallet: `POST /api/access/reconcile` with `{ email, walletAddress }`. Whitelists the wallet with a `reconciled:{email}` label.

## Waitlist Promotion

- **Referral threshold**: 3 successful referrals → auto-promote via `incrementReferralAndCheckPromotion`
- **Admin**: `POST /api/admin/waitlist` with address to manually promote
- **Konami code**: `POST /api/access/konami` with `{ address }` — secret backdoor easter egg

## Konami Code Easter Egg

- `useKonamiCode` hook in `hooks/useKonamiCode.ts` — listens for ↑↑↓↓←→←→BA
- `KonamiOverlay` component — tactical scan animation, then wallet address input
- On submit: calls `/api/access/konami` which promotes from waitlist or whitelists directly
- Lives on the home page (`app/page.tsx`) only

## Key Files

| File | Role |
|------|------|
| `lib/services/waitlistService.ts` | Core waitlist business logic |
| `lib/services/whitelistService.ts` | Whitelist CRUD |
| `app/api/access/validate/route.ts` | Gate endpoint (wallet + email) |
| `app/api/access/reconcile/route.ts` | Email-to-wallet linking |
| `app/api/access/konami/route.ts` | Konami secret whitelist |
| `app/api/waitlist/status/route.ts` | Waitlist position polling |
| `app/waitlist/WaitlistClient.tsx` | Waitlist page UI |
| `lib/hooks/useWaitlist.ts` | Client polling hook |
| `hooks/useKonamiCode.ts` | Konami sequence detector |
| `components/KonamiOverlay.tsx` | Tactical scan overlay + input |
