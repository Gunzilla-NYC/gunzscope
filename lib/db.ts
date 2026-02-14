/**
 * Prisma Database Client Singleton
 *
 * This module provides a single PrismaClient instance that's reused across
 * the application to prevent connection pool exhaustion in serverless environments.
 *
 * Uses Neon serverless PostgreSQL via @prisma/adapter-neon.
 */

import { PrismaClient } from './generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL!;

// PrismaNeon takes a PoolConfig and manages its own connection pool internally
const adapter = new PrismaNeon({ connectionString });

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
