/**
 * Database seed script — populates a fresh PostgreSQL database with
 * essential data: whitelist entries and the admin user profile.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Requires DATABASE_URL to be set (in .env.local or environment).
 */

import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...\n');

  // --- Whitelist entries ---
  const whitelistEntries = [
    { address: '0xf9434e3057432032bb621aa5144329861869c72f', label: 'cryptohaki (primary)', addedBy: 'seed' },
    { address: '0x266613e808ad545d805fc0ef28cc39e2615f66ec', label: 'cryptohaki (alt)', addedBy: 'seed' },
    { address: '0x22e29e38a88e927e3f4caa54cbf867e0d25880bb', label: 'Maher Barrak', addedBy: 'seed' },
    { address: '0x93d3f674f498872d73f34a9d86dd0070ea0430ad', label: 'Big Saus', addedBy: 'seed' },
    { address: '0xba7c0800be9f5dbad13d76e5c74e4bc31b527b01', label: 'test user', addedBy: 'seed' },
    { address: '0x3f0872605d8408b640798ca3a9a1c0b778efb3b8', label: 'FAT.toe', addedBy: 'seed' },
  ];

  for (const entry of whitelistEntries) {
    await prisma.whitelistEntry.upsert({
      where: { address: entry.address },
      update: { label: entry.label },
      create: entry,
    });
    console.log(`  Whitelist: ${entry.address} (${entry.label})`);
  }

  // --- Admin user profile ---
  const adminProfile = await prisma.userProfile.upsert({
    where: { dynamicUserId: '3cdb8d4b-a3e5-41c0-bddd-a01ebc47f748' },
    update: { displayName: 'cryptohaki' },
    create: {
      dynamicUserId: '3cdb8d4b-a3e5-41c0-bddd-a01ebc47f748',
      displayName: 'cryptohaki',
    },
  });
  console.log(`  Profile: ${adminProfile.id} (${adminProfile.displayName})`);

  // Link primary wallet to profile
  await prisma.wallet.upsert({
    where: {
      userProfileId_address_chain: {
        userProfileId: adminProfile.id,
        address: '0xf9434e3057432032bb621aa5144329861869c72f',
        chain: 'avalanche',
      },
    },
    update: { isPrimary: true },
    create: {
      userProfileId: adminProfile.id,
      address: '0xf9434e3057432032bb621aa5144329861869c72f',
      chain: 'avalanche',
      isPrimary: true,
    },
  });
  console.log('  Wallet: primary linked\n');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
