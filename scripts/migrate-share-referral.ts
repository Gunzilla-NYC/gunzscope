/**
 * Migration script for Share & Referral Redesign
 *
 * Run BEFORE `prisma db push` to prepare existing data:
 * 1. Backfill Referrer: slugType = 'custom', customSlug = slug
 * 2. Rename ShareLink platform 'copy' → 'link'
 * 3. Deduplicate ShareLinks per (address, platform): keep most recent, archive rest
 *
 * Usage: npx tsx scripts/migrate-share-referral.ts
 */
import 'dotenv/config';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Enable WebSocket for Neon in Node.js
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Step 1: Add new columns to referrers (if not exist) ─────────────
    console.log('[1/5] Adding slugType + customSlug columns to referrers...');
    await client.query(`
      ALTER TABLE referrers
        ADD COLUMN IF NOT EXISTS "slugType" TEXT DEFAULT 'custom',
        ADD COLUMN IF NOT EXISTS "customSlug" TEXT;
    `);

    // ── Step 2: Backfill existing referrers ─────────────────────────────
    console.log('[2/5] Backfilling referrers: slugType=custom, customSlug=slug...');
    const backfillResult = await client.query(`
      UPDATE referrers
      SET "slugType" = 'custom',
          "customSlug" = slug
      WHERE "customSlug" IS NULL;
    `);
    console.log(`  → ${backfillResult.rowCount} referrers backfilled`);

    // Add unique constraint on customSlug (ignore if exists)
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "referrers_customSlug_key" ON referrers ("customSlug");
      `);
      console.log('  → customSlug unique index created');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  → customSlug index already exists or skipped: ${msg}`);
    }

    // ── Step 3: Add new columns to share_links ──────────────────────────
    console.log('[3/5] Adding archived + archivedRedirectTo columns to share_links...');
    await client.query(`
      ALTER TABLE share_links
        ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS "archivedRedirectTo" TEXT;
    `);

    // ── Step 4: Rename platform 'copy' → 'link' ────────────────────────
    console.log('[4/5] Renaming platform copy → link...');
    const renameResult = await client.query(`
      UPDATE share_links SET platform = 'link' WHERE platform = 'copy';
    `);
    console.log(`  → ${renameResult.rowCount} rows renamed`);

    // ── Step 5: Deduplicate share_links per (address, platform) ─────────
    console.log('[5/5] Deduplicating share_links...');

    // Find duplicate groups
    const dupes = await client.query(`
      SELECT address, platform, COUNT(*) as cnt
      FROM share_links
      WHERE archived = false
      GROUP BY address, platform
      HAVING COUNT(*) > 1;
    `);
    console.log(`  → ${dupes.rows.length} duplicate groups found`);

    let archivedCount = 0;
    for (const row of dupes.rows) {
      // Keep the most recent (by createdAt), archive the rest
      const links = await client.query(`
        SELECT id, code, "createdAt"
        FROM share_links
        WHERE address = $1 AND platform = $2 AND archived = false
        ORDER BY "createdAt" DESC;
      `, [row.address, row.platform]);

      const keeper = links.rows[0];
      const toArchive = links.rows.slice(1);

      for (const old of toArchive) {
        await client.query(`
          UPDATE share_links
          SET archived = true, "archivedRedirectTo" = $1
          WHERE id = $2;
        `, [keeper.code, old.id]);
        archivedCount++;
      }
    }
    console.log(`  → ${archivedCount} duplicate links archived`);

    // Now add the unique constraint on (address, platform) for non-archived rows
    // We need a partial unique index since archived rows would conflict
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "share_links_address_platform_key"
        ON share_links (address, platform)
        WHERE archived = false;
      `);
      console.log('  → Unique index (address, platform) created');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  → Index creation note: ${msg}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration complete!');

    // Summary
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM referrers) as referrers,
        (SELECT COUNT(*) FROM share_links WHERE archived = false) as active_shares,
        (SELECT COUNT(*) FROM share_links WHERE archived = true) as archived_shares;
    `);
    const s = stats.rows[0];
    console.log(`\nSummary: ${s.referrers} referrers, ${s.active_shares} active shares, ${s.archived_shares} archived shares`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
