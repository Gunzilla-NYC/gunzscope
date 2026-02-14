/**
 * Prisma Database Client Singleton
 *
 * This module provides a single PrismaClient instance that's reused across
 * the application to prevent connection pool exhaustion in serverless environments.
 *
 * Prisma 7+ requires a driver adapter for all databases.
 *
 * On Vercel serverless, the filesystem is read-only. better-sqlite3 defaults to
 * read-write mode which fails when SQLite tries to create journal files.
 * We open in readonly mode on Vercel so reads work reliably.
 */

import { PrismaClient } from './generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// Resolve database path relative to project root so it works in both
// local dev (cwd = project root) and Vercel serverless (cwd varies).
const defaultDbPath = `file:${path.join(process.cwd(), 'dev.db')}`;
const databaseUrl = process.env.DATABASE_URL || defaultDbPath;

// On Vercel (read-only filesystem), open SQLite in readonly mode.
// Locally, open in default read-write mode for full functionality.
const isVercel = !!process.env.VERCEL;

// Create SQLite driver adapter
const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
  ...(isVercel && { readonly: true }),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

/** True when running on Vercel's read-only filesystem (SQLite is readonly) */
export const isReadOnlyDatabase = isVercel;
