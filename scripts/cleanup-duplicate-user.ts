/**
 * One-time cleanup: delete duplicate cryptohaki UserProfile.
 *
 * The wallet 0xf943...c72f has two UserProfile records.
 * Keep the one with activity (shares > 0), delete the empty one.
 *
 * Usage: npx tsx scripts/cleanup-duplicate-user.ts
 */
import 'dotenv/config';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Map of table → FK column that references user_profiles.id
const DEPENDENT_TABLES: [string, string][] = [
  ['wallets', 'userProfileId'],
  ['tracked_addresses', 'userProfileId'],
  ['portfolio_addresses', 'userProfileId'],
  ['favorite_items', 'userProfileId'],
  ['user_settings', 'userProfileId'],
  ['share_links', 'userProfileId'],
  ['portfolio_caches', 'userProfileId'],
  ['feature_requests', 'authorId'],
  ['feature_request_votes', 'userId'],
  ['alert_preferences', 'userId'],
  ['alert_logs', 'userId'],
];

async function main() {
  const TARGET_WALLET = '0xf9434e3057432032bb621aa5144329861869c72f';

  // Find all UserProfiles that own this wallet address
  const { rows: profiles } = await pool.query(`
    SELECT
      up.id,
      up."displayName",
      up."createdAt",
      w.chain,
      (SELECT COUNT(*) FROM share_links sl WHERE sl."userProfileId" = up.id) AS share_count,
      (SELECT COUNT(*) FROM feature_requests fr WHERE fr."authorId" = up.id) AS req_count,
      (SELECT COUNT(*) FROM favorite_items fi WHERE fi."userProfileId" = up.id) AS fav_count
    FROM user_profiles up
    JOIN wallets w ON w."userProfileId" = up.id
    WHERE LOWER(w.address) = LOWER($1)
    ORDER BY up."createdAt" ASC
  `, [TARGET_WALLET]);

  console.log(`Found ${profiles.length} profile(s) for ${TARGET_WALLET}:\n`);
  for (const p of profiles) {
    console.log(`  id: ${p.id}`);
    console.log(`  displayName: ${p.displayName ?? '(none)'}`);
    console.log(`  chain: ${p.chain}`);
    console.log(`  createdAt: ${p.createdAt}`);
    console.log(`  shares: ${p.share_count}, reqs: ${p.req_count}, favs: ${p.fav_count}`);
    console.log();
  }

  if (profiles.length <= 1) {
    console.log('No duplicates to clean up.');
    return;
  }

  // Find the empty duplicate (0 shares, 0 reqs, 0 favs)
  // Deduplicate by profile ID first (same profile may appear for multiple wallet chains)
  const uniqueProfiles = new Map<string, typeof profiles[0]>();
  for (const p of profiles) {
    if (!uniqueProfiles.has(p.id)) uniqueProfiles.set(p.id, p);
  }

  if (uniqueProfiles.size <= 1) {
    console.log('Only 1 unique profile — the same profile has multiple wallet chains. No duplicates.');
    return;
  }

  const profileList = [...uniqueProfiles.values()];
  const toDelete = profileList.find(
    (p) => Number(p.share_count) === 0 && Number(p.req_count) === 0 && Number(p.fav_count) === 0
  );

  if (!toDelete) {
    console.log('No empty profile found — both have activity. Manual review needed.');
    return;
  }

  console.log(`Deleting empty profile: ${toDelete.id} (created ${toDelete.createdAt})`);

  // Delete dependent rows using correct FK column names
  for (const [table, fkColumn] of DEPENDENT_TABLES) {
    const { rowCount } = await pool.query(
      `DELETE FROM ${table} WHERE "${fkColumn}" = $1`,
      [toDelete.id],
    );
    if (rowCount && rowCount > 0) {
      console.log(`  Cleaned ${rowCount} row(s) from ${table}`);
    }
  }

  // Delete the profile itself
  const { rowCount } = await pool.query(
    `DELETE FROM user_profiles WHERE id = $1`,
    [toDelete.id],
  );
  console.log(`\nDeleted profile: ${rowCount} row(s)`);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
