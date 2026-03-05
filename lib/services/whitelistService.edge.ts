/**
 * Edge-compatible whitelist check — imported by middleware.ts.
 *
 * This file MUST NOT import Prisma, Node.js modules, or anything
 * that pulls in node:path / node:buffer. It uses @neondatabase/serverless
 * HTTP queries only.
 *
 * The WHERE predicate here is the SAME as in whitelistService.ts.
 * If you change the schema (expiresAt, isActive, tiers), update BOTH files.
 * See whitelistService.ts header comment.
 */

import { neon } from '@neondatabase/serverless';

/**
 * Edge-compatible whitelist check using @neondatabase/serverless.
 * Same predicate as checkWhitelist() in whitelistService.ts,
 * but runs over HTTP — no Prisma needed.
 */
export async function checkWhitelistEdge(address: string): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;

  const identifier = address.toLowerCase();
  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT 1 FROM whitelist_entries
    WHERE address = ${identifier}
    AND "isActive" = true
    AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    LIMIT 1
  `;
  return rows.length > 0;
}
