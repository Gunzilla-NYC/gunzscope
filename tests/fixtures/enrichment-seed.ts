export const TEST_WALLET = '0xf9434e3057432032bb621aa5144329861869c72f';

const CONTRACT = '0x9ed98e159be43a8d42b64053831fcae5e4d7d271';
const CHAIN = 'avalanche';
const TOKEN_IDS = ['247585', '1088272', '1288769', '1552957', '5705477', '5056414'];

const now = Date.now();
const TTL_MS = 72 * 60 * 60 * 1000;

export const SEED_CACHE: Record<string, string> = Object.fromEntries(
  TOKEN_IDS.map((id, i) => [
    `gunzscope:nft:detail:v25:${TEST_WALLET}:${CHAIN}:${CONTRACT}:${id}`,
    JSON.stringify({
      costBasis: 200 + i * 150,
      purchaseDate: new Date('2025-12-25').toISOString(),
      purchasePrice: 200 + i * 150,
      enrichedAt: new Date(now).toISOString(),
      cachedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + TTL_MS).toISOString(),
      enrichmentSource: 'opensea',
      marketValue: 150 + i * 100,
      unrealizedPnl: -50 - i * 20,
      unrealizedPnlPct: -15 - i * 3,
    })
  ])
);
