# Portfolio Attestation V2 — Deployment Notes

## Contract Addresses

| Network | Proxy | Implementation (V2) |
|---------|-------|---------------------|
| Avalanche C-Chain (43114) | `0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16` | `0x80A6C9661Fb0fEd1cCEBf568bCb709D548B98358` |
| Avalanche Fuji (43113) | `0x423C2F540893689475281Dc4052Ef08C31D979fa` | `0x3DDBAB96ff908F796Ad34F804a4B2D834314c177` |

Both proxies use UUPS pattern. Owner: `0x8ABF795f22931DFb0D086693343F5f80571b488C` (Ledger, derivation path `44'/60'/3'/0/0`).

## V2 Features (over V1)

1. **gsHandle** — on-chain gaming identity. First registration free, changes cost `handleChangeFee` (default 0.005 AVAX).
2. **Multi-wallet registry** — `addWallet`, `removeWallet`, `batchAddWallets`, `batchRemoveWallets`, `takeoverWallet`.
3. **WalletStatus enum** — NONE(0), PRIMARY(1), VERIFIED(2), SELF_REPORTED(3).
4. **Batch wallet sync** — DB stays primary for daily wallet management. On-chain writes happen only at attestation time via batch functions.

## Frontend Integration

- `lib/attestation/contract.ts` — V2 ABI + all helper functions (handle, wallet management)
- `lib/attestation/walletSync.ts` — delta computation between DB and on-chain wallets
- `lib/hooks/useGsHandle.ts` — handle registration/change hook
- `lib/hooks/useHandleResolver.ts` — batch address-to-handle resolution
- `lib/hooks/usePortfolioAttestation.ts` — wallet sync step added between chain switch and metadata upload
- `components/account/HandleRegistration.tsx` — handle claim/change UI
- `components/header/WalletIdentity.tsx` — sync status display
- `app/explore/page.tsx` — handle display + search
- `app/explore/attestation/[cid]/page.tsx` — handle + portfolio wallets display
- `app/api/attestation/resolve-handle/route.ts` — handle resolution API
- `app/api/attestation/upload/route.ts` — metadata now includes `gsHandle` and `wallets` array
- `app/api/attestation/status/route.ts` — includes `handleChangeFee`
- `components/account/admin/OnChainTools.tsx` — handle change fee display + update

## Deployment Gotchas

- **hardhat-ledger plugin is broken** — `extendProvider` wrapping doesn't apply, `getSigners()` returns empty. Use custom `LedgerSigner` in `onchain/scripts/upgrade-mainnet-ledger.ts` instead.
- **Ledger derivation path**: Address is at `44'/60'/3'/0/0` (account index 3), not the default index 0.
- **OZ manifest sync**: If deploying from a different machine than original deploy, use `forceImport` before `upgradeProxy`.
- **ethers v6 + Ledger**: Must strip `from` field before `Transaction.from()` for unsigned tx serialization.
- **`handleChangeFee()` call**: Wrapped in `.catch(() => null)` in status API since V1 contracts don't have this function.

## Attestation Flow (V2)

```
building → switching-chain → syncing-wallets → uploading → signing → confirming → success
```

The `syncing-wallets` step:
1. Reads on-chain wallets via `getPortfolioWalletsOnChain()`
2. Computes delta via `computeWalletSyncActions()` (compare DB vs on-chain)
3. Executes `batchAddWallets` + `batchRemoveWallets` — max 2 MetaMask popups
4. Graceful error handling: wallet claimed by another → skip with warning
