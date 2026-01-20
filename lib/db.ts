/**
 * Prisma Database Client Singleton
 *
 * This module provides a single PrismaClient instance that's reused across
 * the application to prevent connection pool exhaustion in serverless environments.
 *
 * Prisma 7+ requires a driver adapter for all databases.
 */

import { PrismaClient } from './generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

// Create SQLite driver adapter
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

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
