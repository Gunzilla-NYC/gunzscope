/**
 * Migration script for Share & Referral v2.1
 *
 * Adds slug change tracking fields to the referrers table:
 * - previous_slug: stores old slug after a change (30-day redirect)
 * - slug_changed_at: when the slug was last changed
 * - slug_changes_remaining: number of custom slug changes allowed (default 1)
 *
 * Usage: npx tsx scripts/migrate-v2.1.ts
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

    // Check if columns already exist
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'referrers'
      AND column_name IN ('previous_slug', 'slug_changed_at', 'slug_changes_remaining')
    `);
    const existingColumns = new Set(rows.map(r => r.column_name));

    if (!existingColumns.has('previous_slug')) {
      console.log('Adding previous_slug column...');
      await client.query(`ALTER TABLE referrers ADD COLUMN previous_slug TEXT`);
    } else {
      console.log('previous_slug already exists, skipping');
    }

    if (!existingColumns.has('slug_changed_at')) {
      console.log('Adding slug_changed_at column...');
      await client.query(`ALTER TABLE referrers ADD COLUMN slug_changed_at TIMESTAMPTZ`);
    } else {
      console.log('slug_changed_at already exists, skipping');
    }

    if (!existingColumns.has('slug_changes_remaining')) {
      console.log('Adding slug_changes_remaining column...');
      await client.query(`ALTER TABLE referrers ADD COLUMN slug_changes_remaining INT NOT NULL DEFAULT 1`);
    } else {
      console.log('slug_changes_remaining already exists, skipping');
    }

    // Add index on previous_slug for redirect lookups
    const indexCheck = await client.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'referrers' AND indexname = 'referrers_previous_slug_idx'
    `);
    if (indexCheck.rows.length === 0) {
      console.log('Creating index on previous_slug...');
      await client.query(`CREATE INDEX referrers_previous_slug_idx ON referrers (previous_slug) WHERE previous_slug IS NOT NULL`);
    } else {
      console.log('previous_slug index already exists, skipping');
    }

    await client.query('COMMIT');

    // Summary
    const { rows: summary } = await client.query(`SELECT count(*) as total FROM referrers`);
    console.log(`\nDone! ${summary[0].total} referrers in table.`);
    console.log('All existing referrers have slug_changes_remaining = 1 (default).');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
