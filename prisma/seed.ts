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
    { address: '0xe4edb38da3ebc519ae72ec432869a223b19a3a72', label: 'get_wrong18', addedBy: 'seed' },
    { address: '0x8ad9bb7d1c96eb8a7f01e0fa8d545cf26bfaecf1', label: 'oodaboogah', addedBy: 'seed' },
    { address: '0xd691d9f792efd7076502a54f09a475160f4ae1f3', label: 'meatport', addedBy: 'seed' },
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

  // --- Item Origin Releases ---
  console.log('Seeding item origins...');

  const releases = [
    { slug: 'pioneers',       name: 'Pioneer Set',                          shortName: 'Pioneer Set',        category: 'early_access', date: '2024-05-15', description: 'Available for 1 week only' },
    { slug: 'player-zero',    name: 'Player Zero Set',                      shortName: 'Player Zero',        category: 'reward',     date: null, description: 'Only available if Closed Tester' },
    { slug: 'all-stars',      name: 'ALL-STARS USA',                        shortName: 'ALL-STARS',          category: 'event',      date: '2024-11-21', description: null },
    { slug: 'xmas-pack',      name: 'Crackhead Christmas Content Pack',     shortName: 'Xmas Pack',          category: 'event',      date: '2024-12-13', description: null },
    { slug: 'combat-dj',      name: 'Combat DJ',                            shortName: 'Combat DJ',          category: 'event',      date: '2025-03-15', description: null },
    { slug: 'aperil-event',   name: 'APE-RIL Fools: The Great Ape Hunt',    shortName: 'APE-RIL',            category: 'event',      date: '2025-04-01', description: null },
    { slug: 'halloween',      name: 'Trick, Treat or Die',                  shortName: 'Trick, Treat or Die', category: 'event',     date: '2025-10-17', description: 'Candy Bag Collectibles: 10 Candy bags scattered across the island. Collect all 10 to unlock the "Tooch Decayer" achievement in the Career Page event tab, rewarding the Hell Sack Mask. First Zero to find all 10 gets Serial Number #1. | Halloween-themed Hexes: Found around the map or purchasable for GUN from the main menu (testnet only, limited to 2 per day). Contents: Single-Use Psycho Mask (limited 100 per platform), 3x Spooky Character Sets (10 items), 5x Emotes, 2x Profile Banners, 15x Halloween Profile Avatars, 3x New Weapon Skins (72 skins total). | Community Events: 666 Sackrifice Masks distributed through community events throughout October, rewarding dedicated killers on Feardrop Island.' },
    { slug: 'hexmas',         name: 'Hexmas',                               shortName: 'Hexmas',             category: 'event',      date: null, description: null },
    { slug: 'neotokyo',       name: 'Neotokyo',                             shortName: 'Neotokyo',           category: 'event',      date: null, description: null },
    { slug: 'loyalty',        name: 'Loyalty Rewards',                      shortName: 'Loyalty',            category: 'event',      date: null, description: null },
    { slug: 'save-democracy', name: 'Save Democracy',                       shortName: 'Save Democracy',     category: 'content_pack', date: null, description: null },
    { slug: 'westcol',        name: 'OTG Pro Content Pack: Westcol',        shortName: 'Westcol',            category: 'pro_pack',   date: '2025-03-27', description: null },
    { slug: 'scump',          name: 'OTG Pro Content Pack: Scump',          shortName: 'Scump',              category: 'pro_pack',   date: null, description: null },
    { slug: 'nuestros',       name: 'OTG Pro Content Pack: Nuestros Diablos', shortName: 'Nuestros Diablos', category: 'pro_pack',   date: null, description: null },
    { slug: 'crash-test-ted', name: 'OTG Pro Content Pack: Crash Test Ted',  shortName: 'Crash Test Ted',    category: 'pro_pack',   date: '2025-05-02', description: null },
    { slug: 'pc-vs-console',  name: 'OTG Pro Content Pack: PC vs Console',   shortName: 'PC vs Console',     category: 'pro_pack',   date: '2025-06-06', description: null },
    { slug: 'cracker-jack',   name: 'OTG Pro Content Pack: Major Cracker Jack', shortName: 'Cracker Jack',   category: 'pro_pack',   date: null, description: null },
    { slug: 'the-comeback',         name: 'Content Pack: The Comeback',          shortName: 'The Comeback',          category: 'pro_pack', date: '2025-08-15', description: null },
    { slug: 'don-delulu',           name: 'Content Pack: Don DeLulu',            shortName: 'Don DeLulu',            category: 'pro_pack', date: '2025-11-06', description: null },
    { slug: 'rockstar',             name: 'Content Pack: Rockstar',              shortName: 'Rockstar',              category: 'pro_pack', date: '2026-02-12', description: null },
    { slug: 'dj-golden-boi',        name: 'Content Pack: DJ Golden Boi',         shortName: 'DJ Golden Boi',         category: 'pro_pack', date: '2025-12-30', description: null },
    { slug: 'mrs-crackhead-santa',  name: 'Content Pack: Mrs Crackhead Santa',   shortName: 'Mrs Crackhead Santa',   category: 'pro_pack', date: null, description: null },
    { slug: 'aperil-fools-cp',      name: 'Content Pack: APE-RIL Fools',         shortName: 'APE-RIL Fools CP',      category: 'pro_pack', date: '2025-04-01', description: null },
    { slug: 'chemtech-bp',       name: 'Battle Pass: ChemTech',        shortName: 'ChemTech Set',       category: 'battlepass', date: '2025-04-17', description: null },
    { slug: 'red-ant-bp',        name: 'Battle Pass: Red Ant',         shortName: 'Red Ant Set',        category: 'battlepass', date: '2025-05-30', description: null },
    { slug: 'anti-cheat-bp',     name: 'Battle Pass: Anti-Cheat',      shortName: 'Anti-Cheat Set',     category: 'battlepass', date: null, description: null },
    { slug: 'drone-op-bp',       name: 'Battle Pass: Drone Operator',  shortName: 'Drone Op Set',       category: 'battlepass', date: '2025-07-16', description: null },
    { slug: 'zero-chill-bp',     name: 'Battle Pass: Zero Chill',      shortName: 'Zero Chill Set',     category: 'battlepass', date: '2025-07-16', description: null },
    { slug: 'hexmas-bp',         name: 'Battle Pass: Hexmas',          shortName: 'Hexmas Set',         category: 'battlepass', date: null, description: null },
    { slug: 'black-friday-bp',   name: 'Battle Pass: Black Friday',    shortName: 'Black Friday Set',   category: 'battlepass', date: null, description: null },
    { slug: 'templar-bp',        name: 'Battle Pass: Templar',         shortName: 'Templar Set',        category: 'battlepass', date: null, description: null },
    { slug: 'kiiro-shinobi-bp',  name: 'Battle Pass: Kiiro Shinobi',   shortName: 'Kiiro Shinobi Set',  category: 'battlepass', date: null, description: null },
    { slug: 'prankster',          name: 'Prankster Set',                shortName: 'Prankster Set',      category: 'pro_pack',   date: null, description: 'Battle Pass - Early Access' },
    { slug: 'anarchist-bp',      name: 'Anarchist Set',                shortName: 'Anarchist Set',      category: 'pro_pack',   date: null, description: 'Battle Pass - Early Access' },
    { slug: 'hitori-yubi-bp',   name: 'Battle Pass: Hitori Yubi',     shortName: 'Hitori Yubi Set',    category: 'battlepass', date: null, description: null },
    { slug: 'hopper-pilot-bp',  name: 'Battle Pass: Hopper Pilot',    shortName: 'Hopper Pilot Set',   category: 'battlepass', date: null, description: null },
    { slug: 'mad-biker-bp',     name: 'Battle Pass: Mad Biker',       shortName: 'Mad Biker Set',      category: 'battlepass', date: null, description: null },
    { slug: 'enforcer-bp',      name: 'Battle Pass: Enforcer',        shortName: 'Enforcer Set',       category: 'battlepass', date: null, description: null },
    { slug: 'pink-fury-bp',     name: 'Battle Pass: Pink Fury',       shortName: 'Pink Fury Set',      category: 'battlepass', date: null, description: null },
    { slug: 'mr-fuckles-bp',    name: 'Battle Pass: Mr Fuckles',      shortName: 'Mr Fuckles Set',     category: 'battlepass', date: null, description: null },
    { slug: 'ranked-s1',        name: 'Ranked Season 1',              shortName: 'Ranked S1',          category: 'ranked',     date: null, description: null },
    // Full body skin packs (unmapped — need user to confirm category/dates)
    { slug: 'ninja-set',         name: 'Ninja Set',                      shortName: 'Ninja Set',           category: 'content_pack', date: null, description: null },
    { slug: 'blue-set',          name: 'Blue Set',                       shortName: 'Blue Set',            category: 'content_pack', date: null, description: null },
    { slug: 'red-set',           name: 'Red Set',                        shortName: 'Red Set',             category: 'content_pack', date: null, description: null },
    { slug: 'yankee-doodle',     name: 'Yankee Doodle Damage',           shortName: 'Yankee Doodle',       category: 'content_pack', date: null, description: null },
    { slug: 'le-bobo',           name: "Content Pack: Le' Bobo",         shortName: "Le' Bobo",            category: 'content_pack', date: null, description: null },
    { slug: 'joey-pulse',        name: 'Content Pack: Joey Pulse',       shortName: 'Joey Pulse',          category: 'content_pack', date: null, description: null },
    { slug: 'solana-set',        name: 'Solana Set',                     shortName: 'Solana Set',          category: 'content_pack', date: null, description: 'Solana-exclusive weapon variants' },
    { slug: 'legacy',            name: 'Legacy Collection',              shortName: 'Legacy',              category: 'content_pack', date: null, description: 'Base game legacy weapon variants' },
    { slug: 'retro',             name: 'Retro Collection',               shortName: 'Retro',               category: 'content_pack', date: null, description: 'Base game retro weapon variants' },
    { slug: 'feedkiller',        name: 'Feedkiller Campaign',            shortName: 'Feedkiller',          category: 'event',        date: null, description: 'Feedkiller Campaign weapon variants' },
    { slug: 'unmapped',          name: 'Unmapped',                       shortName: 'Unknown',             category: 'content_pack', date: null, description: 'Bucket for items not yet mapped to a release' },
  ];

  for (const r of releases) {
    await prisma.itemOriginRelease.upsert({
      where: { slug: r.slug },
      update: { name: r.name, shortName: r.shortName, category: r.category, date: r.date, description: r.description },
      create: r,
    });
  }
  console.log(`  Releases: ${releases.length} upserted`);

  // --- Item Origin Items (name → release mappings) ---
  const items: Array<[string, string]> = [
    // APE-RIL Event
    ["Ape-Fool's Gold Mask", 'aperil-event'],
    ['Ape-Fool Mask', 'aperil-event'],
    ['Apex Predator Skin for the Kite', 'aperil-event'],
    ['Apex Predator Skin for the Flenser', 'aperil-event'],
    // Halloween
    ['Hell Sack Mask', 'halloween'],
    ['Hell Sack', 'halloween'],
    ['Sackrifice Mask', 'halloween'],
    ['Psycho Mask', 'halloween'],
    ['Single-Use Psycho', 'halloween'],
    ['Sack the Ripper #1', 'halloween'],
    // Hexmas
    ['Happy Hexmas #1', 'hexmas'],
    ['Silent Night Beret', 'hexmas'],
    ['Tinsel Trauma Trail', 'hexmas'],
    ['Coca Claus Shorts', 'hexmas'],
    ['Golden Booties', 'hexmas'],
    ["Sleigh 'N Slay Puffer", 'hexmas'],
    ['Jingle Brawl Beret', 'hexmas'],
    ['Methlebell #1', 'hexmas'],
    ['Tweakle Toes Shirt', 'hexmas'],
    ['Jingle Frags #1', 'hexmas'],
    ['Skele-Claus #1', 'hexmas'],
    ['Hawk Blue Blood', 'hexmas'],
    ['Meth Made', 'hexmas'],
    ['Ho Ho Hoes #1', 'hexmas'],
    ['Tweakle Toes #1', 'hexmas'],
    ['Jingle Slay Puffer', 'hexmas'],
    ['Kite Blue Blood', 'hexmas'],
    ['Tap9 Blue Blood', 'hexmas'],
    ['Tree-Top Trigger #1', 'hexmas'],
    ['Sleigh Bitch #1', 'hexmas'],
    ['Sugarplum Beanie', 'hexmas'],
    ['Squall Blue Blood', 'hexmas'],
    ['Minty Beanie', 'hexmas'],
    ['Merry Killmas #1', 'hexmas'],
    ['Home A-Lone #1', 'hexmas'],
    ['Nutkrakka Tinsel Hat', 'hexmas'],
    ['Tacoma Blue Blood', 'hexmas'],
    ['Coca Claus Puffer', 'hexmas'],
    ['Kush Kringle Puffer', 'hexmas'],
    ['Kush Kringle Shorts', 'hexmas'],
    ['Skullmas Beret', 'hexmas'],
    ['Crater Claus #1', 'hexmas'],
    ['Coca Claus Hat', 'hexmas'],
    ['Kush Kringle Hat', 'hexmas'],
    ['Nutkrakka Bauble Shorts', 'hexmas'],
    ['Merry Methmoon #1', 'hexmas'],
    ['Glykobitz - North Pole Pussy', 'hexmas'],
    ['Glykobitz - Santa Pay Me', 'hexmas'],
    ["Glykobitz - It's Beginning to Look a Lot Like Teardrop", 'hexmas'],
    ['Glykobitz - Sleigh Bitch', 'hexmas'],
    ['Glykobitz - Carol of the Damned', 'hexmas'],
    ['Glykobitz - Maul Cop', 'hexmas'],
    // Hexmas BP
    ['Meth The Halls Jetpack', 'hexmas-bp'],
    // Mrs Crackhead Santa CP
    ['Woodpecker Nutkrakka', 'mrs-crackhead-santa'],
    ['Mrs Crackhead Santa', 'mrs-crackhead-santa'],
    ['Sleigh Queen', 'mrs-crackhead-santa'],
    ['Ms Santa Slay #1', 'mrs-crackhead-santa'],
    // APE-RIL Fools CP
    ['M4 Ape-X Predator', 'aperil-fools-cp'],
    ['Alpha Ape Shit Set', 'aperil-fools-cp'],
    ['Banana Rekt Republic Set', 'aperil-fools-cp'],
    ['Going Apeshit', 'aperil-fools-cp'],
    ['Going Ape Shit', 'aperil-fools-cp'],
    ['Hump for Dominance', 'aperil-fools-cp'],
    ['Woodpecker Banananizer', 'aperil-fools-cp'],
    // Prankster Set
    ['Woodpecker Prankster', 'prankster'],
    ['Prankster Shorts', 'prankster'],
    // Don DeLulu CP
    ['Don DeLulu', 'don-delulu'],
    ['Il Silenzio', 'don-delulu'],
    ["Heads, you're Liquidated", 'don-delulu'],
    ['Rose Gold', 'don-delulu'],
    ['Goldchain', 'don-delulu'],
    // Red Ant BP
    ['Red Ant Jetpack', 'red-ant-bp'],
    ['Red Ant Helmet', 'red-ant-bp'],
    ['Mavinga Red Ant', 'red-ant-bp'],
    ['Red Ant Mask', 'red-ant-bp'],
    ['Red Ant Shirt', 'red-ant-bp'],
    ['Red Ant Shorts', 'red-ant-bp'],
    ['Red Ant Sneakers', 'red-ant-bp'],
    ['Red Ant Tac Vest', 'red-ant-bp'],
    ['Red Ant Visor', 'red-ant-bp'],
    // Templar BP
    ['Templar T-shirt', 'templar-bp'],
    ['Templar Tac Vest', 'templar-bp'],
    ['Kestrel Templar', 'templar-bp'],
    ['Templar Helmet', 'templar-bp'],
    ['Templar Shorts', 'templar-bp'],
    ['Templar Mask', 'templar-bp'],
    ['Templar Jetpack', 'templar-bp'],
    // Kiiro Shinobi BP
    ['Kiiro Shinobi Pants', 'kiiro-shinobi-bp'],
    ['Kiiro Shinobi Hoodie', 'kiiro-shinobi-bp'],
    ['Kelowna Kiiro Shinobi', 'kiiro-shinobi-bp'],
    ['Kiiro Shinobi Vest', 'kiiro-shinobi-bp'],
    ['Kiiro Shinobi Mask', 'kiiro-shinobi-bp'],
    ['Kiiro Shinobi Jetpack', 'kiiro-shinobi-bp'],
    // Anarchist BP
    ['Anarchist Tac Vest', 'anarchist-bp'],
    ['Anarchist T-Shirt', 'anarchist-bp'],
    ['Anarchist Shorts', 'anarchist-bp'],
    ['Hawk Anarchist', 'anarchist-bp'],
    ['Anarchist Jetpack', 'anarchist-bp'],
    ['Anarchist Helmet', 'anarchist-bp'],
    // Ranked Season 1
    ['M4 Commodore Icon', 'ranked-s1'],
    ['Icon', 'ranked-s1'],
    ['M4 Commodore Celebrity', 'ranked-s1'],
    ['Celebrity', 'ranked-s1'],
    ['M4 Commodore Lead Actor', 'ranked-s1'],
    ['Lead Actor', 'ranked-s1'],
    ['M4 Commodore Cameo', 'ranked-s1'],
    ['Cameo', 'ranked-s1'],
    ['Legend', 'ranked-s1'],
    ['M4 Commodore Legend', 'ranked-s1'],
    ['Star', 'ranked-s1'],
    ['M4 Commodore Star', 'ranked-s1'],
    ['M4 Commodore Extra', 'ranked-s1'],
    ['Extra', 'ranked-s1'],
    // Hitori Yubi BP
    ['Hitori Yubi Mask', 'hitori-yubi-bp'],
    ['Hitori Yubi #1', 'hitori-yubi-bp'],
    ['Hitori Yubi Vest', 'hitori-yubi-bp'],
    ['Hitori Yubi Pants', 'hitori-yubi-bp'],
    ['Hitori Yubi T-Shirt', 'hitori-yubi-bp'],
    ['Tacoma Yubikiri', 'hitori-yubi-bp'],
    ['Zankoku Jetpack', 'hitori-yubi-bp'],
    // Enforcer BP
    ['M4 Commodore Enforcer', 'enforcer-bp'],
    // Mad Biker BP
    ['Flenser Mad Biker', 'mad-biker-bp'],
    // Pink Fury BP
    ['Vulture Pink Fury', 'pink-fury-bp'],
    // Loyalty Rewards
    ['Loyalty Reward', 'loyalty'],
    ['Cyan Croc Skin for the Vulture', 'loyalty'],
    // ── Full Body Skins ──────────────────────────────────
    // Xmas Pack
    ['Crackhead Santa Set', 'xmas-pack'],
    // Pro Packs — already-existing releases
    ['Scump Set', 'scump'],
    ['Westcol Set', 'westcol'],
    ['Crash Test Ted Set', 'crash-test-ted'],
    ['Nuestros Diablos Set', 'nuestros'],
    ['PC Gamer Set', 'pc-vs-console'],
    ['Console Gamer Set', 'pc-vs-console'],
    ['The Blitz Comeback Set', 'the-comeback'],
    ['DJ Golden Boi Set', 'dj-golden-boi'],
    // New packs — need user to confirm release category/dates
    ['Ninja Set', 'ninja-set'],
    ['Blue Set', 'blue-set'],
    ['Red Set', 'red-set'],
    ['Yankee Doodle Damage Set', 'yankee-doodle'],
    ["Le' Bobo Set", 'le-bobo'],
    ['Joey Pulse', 'joey-pulse'],
    // ── Jetpacks ────────────────────────────────────────
    // Drone Operator BP
    ['Drone OP Jetpack', 'drone-op-bp'],
    // Cracker Jack
    ['Major Cracker Jack Jetpack', 'cracker-jack'],
    // Mr Fuckles BP
    ['Mr Fuckles Jetpack', 'mr-fuckles-bp'],
    // Halloween
    ["Jet-O'-Lantern", 'halloween'],
    // Black Friday BP
    ['Clearance Jetpack', 'black-friday-bp'],
    // Xmas Pack
    ['Blitzen Burner Jetpack', 'xmas-pack'],
    // ChemTech BP
    ['Chemtech Jetpack', 'chemtech-bp'],
    // Hopper Pilot BP
    ['Hopper Pilot Jetpack', 'hopper-pilot-bp'],
    // Zero Chill BP
    ['Zero Chill Jetpack', 'zero-chill-bp'],
    // Combat DJ
    ['Combat DJ Jetpack', 'combat-dj'],
    // Don DeLulu
    ['"Silence" Jetpack', 'don-delulu'],
    // Enforcer BP
    ['Enforcer Jetpack', 'enforcer-bp'],
    // Pink Fury BP
    ['Pink Fury Jetpack', 'pink-fury-bp'],
    // Mad Biker BP
    ['Mad Biker Jetpack', 'mad-biker-bp'],
    // Player Zero
    ['Player Zero Jetpack', 'player-zero'],
    // Prankster
    ['Prankster Jetpack', 'prankster'],
    // Unmapped — sort later
    ['Pain Thruster', 'unmapped'],
    ['Anniversary Jetpack', 'unmapped'],
    ['Pacifist Jetpack', 'unmapped'],
    ['Impact Junkie Jetpack', 'unmapped'],
    ['Cleanup Crew Jetpack', 'unmapped'],
    ['Gridops Jetpack', 'unmapped'],
    ['Convict Jetpack', 'unmapped'],
    ['Raverunner Jetpack', 'unmapped'],
    ['Doomed Zero Jetpack', 'unmapped'],
    ['Cybergoth Jetpack', 'unmapped'],
    ['Tagger Jetpack', 'unmapped'],
    ['Combat Maniac Jetpack', 'unmapped'],
    // ── Legwear (Pants / Shorts) ───────────────────────────
    // ChemTech BP
    ['Chemtech Pants', 'chemtech-bp'],
    // Hopper Pilot BP
    ['Hopper Pilot Pants', 'hopper-pilot-bp'],
    // Zero Chill BP
    ['Zero Chill Pants', 'zero-chill-bp'],
    // Combat DJ
    ['Combat DJ Pants', 'combat-dj'],
    // Don DeLulu
    ['"Silence" Pants', 'don-delulu'],
    // Drone Operator BP
    ['Drone Op Shorts', 'drone-op-bp'],
    // Cracker Jack
    ['Major Cracker Jack Shorts', 'cracker-jack'],
    // Mad Biker BP
    ['Mad Biker Pants', 'mad-biker-bp'],
    // Player Zero
    ['Player Zero Shorts', 'player-zero'],
    // Pioneers
    ['Pioneer Shorts', 'pioneers'],
    // Enforcer BP
    ['Corporate Enforcer Shorts', 'enforcer-bp'],
    ['Enforcer Shorts', 'enforcer-bp'],
    // Pink Fury BP
    ['Pink Fury Shorts', 'pink-fury-bp'],
    // Mr Fuckles BP
    ['Mr Fuckles Pants', 'mr-fuckles-bp'],
    ['Gimp Groaner Pants', 'mr-fuckles-bp'],
    // Hexmas
    ['Tweakle Toes Cargo', 'hexmas'],
    // Black Friday BP
    ['Black Friday Security Shorts', 'black-friday-bp'],
    // Halloween
    ['Bloody Knees', 'halloween'],
    ['Boo Shorts', 'halloween'],
    ['Boogeyman Pants', 'halloween'],
    // Unmapped legwear — sort later
    ['Gunfighter Shorts', 'unmapped'],
    ['Impact Junkie Shorts', 'unmapped'],
    ['Cleanup Crew Shorts', 'unmapped'],
    ['Gridops Pants', 'unmapped'],
    ['Stormtrooper Shorts', 'unmapped'],
    ['Combat Maniac Shorts', 'unmapped'],
    ['Cybergoth Shorts', 'unmapped'],
    ['Ganger Shorts', 'unmapped'],
    ['Chemical Bro Pants', 'unmapped'],
    ['Chemical Bro Shorts', 'unmapped'],
    ['Convict Pants', 'unmapped'],
    ['Convict Shorts', 'unmapped'],
    ['Street Fighter Pants', 'unmapped'],
    ['Street Fighter Shorts', 'unmapped'],
    ['Flower Shorts', 'unmapped'],
    ['Freebooter Shorts', 'unmapped'],
    ['Tagger Shorts', 'unmapped'],
    ['Pacifist Shorts', 'unmapped'],
    ['Orange Shorts', 'unmapped'],
    ['Scout Shorts', 'unmapped'],
    ['Urban Explorer Shorts', 'unmapped'],
    ['Black Military Shorts', 'unmapped'],
    ['Doomed Zero Shorts', 'unmapped'],
    ['Raverunner Shorts', 'unmapped'],
    ['Saboteur Shorts', 'unmapped'],
    ['Hazmat Shorts', 'unmapped'],
    ['Spec Ops Shorts', 'unmapped'],
    ['Cold War Shorts', 'unmapped'],
    ['Animal Camo Shorts', 'unmapped'],
    ['Urban Rebel Shorts', 'unmapped'],
    ['Maniak Shorts', 'unmapped'],
    ["Jack'd Stripes", 'unmapped'],
    ['Anniversary Pants', 'unmapped'],
    // ── Footwear (Shoes / Boots / Sneakers) ────────────────
    // Mr Fuckles BP
    ['Mr Fuckles Shoes', 'mr-fuckles-bp'],
    // Pioneers
    ['Pioneer Trainers', 'pioneers'],
    // Hexmas
    ['Frostbite Stompers', 'hexmas'],
    // Unmapped footwear — sort later
    ['Streetrunner Shoes', 'unmapped'],
    ['Hiking Boots', 'unmapped'],
    ['Stompers', 'unmapped'],
    ['Military Boots', 'unmapped'],
    ['Trainers', 'unmapped'],
    ['Street Sneakers', 'unmapped'],
    ['Combat Sneakers', 'unmapped'],
    ['Urban Patriot Sneakers', 'unmapped'],
    ['Gunfighter Tac Boots', 'unmapped'],
    // ── Jetpack Trails ─────────────────────────────────────
    // Unmapped trails — sort later
    ['Blizzard Trail', 'unmapped'],
    ['Mean Green Trail', 'unmapped'],
    ['Piss Missile Trail', 'unmapped'],
    // ── Sidearms (Tap9 / Type 227 / Kelowna) ──────────────
    // ALL-STARS
    ['Tap9 All Stars', 'all-stars'],
    // Cracker Jack
    ['Tap9 Maj. Cracker Jack', 'cracker-jack'],
    // Hexmas
    ['Type 227 Sleigh Baller', 'hexmas'],
    // Nuestros Diablos
    ['Kelowna El Diablo', 'nuestros'],
    // Unmapped sidearms — sort later
    ['Tap9', 'unmapped'],
    ['Tap9 Retro', 'retro'],
    ['Tap9 Legacy', 'legacy'],
    ['Tap9 Pacifist', 'unmapped'],
    ['Tap 9 Feedkiller', 'feedkiller'],
    ['Type 227', 'unmapped'],
    ['Type 227 Retro', 'retro'],
    ['Type 227 Legacy', 'legacy'],
    ['Type 227 Impact Junkie', 'unmapped'],
    ['Type 227 Flatliner', 'unmapped'],
    ['Kelowna', 'unmapped'],
    ['Kelowna Retro', 'retro'],
    ['Kelowna Legacy', 'legacy'],
    ['Kelowna Tagger', 'unmapped'],
    // ── Marksman Rifles (Proton / Ichnya) ──────────────────
    // Neotokyo
    ['Proton Neotokyo', 'neotokyo'],
    // Save Democracy
    ['Ichnya Covfefe', 'save-democracy'],
    // Unmapped marksman rifles — sort later
    ['Proton', 'unmapped'],
    ['Proton Retro', 'retro'],
    ['Proton Legacy', 'legacy'],
    ['Proton OpenSea', 'unmapped'],
    ['Proton Feedkiller', 'feedkiller'],
    ['Proton Drifter', 'unmapped'],
    ['Ichnya', 'unmapped'],
    ['Ichnya Retro', 'retro'],
    ['Ichnya Legacy', 'legacy'],
    // ── Sniper Rifles (Kestrel / Osprey / Pierser) ─────────
    // Zero Chill BP
    ['Osprey Zero Chill', 'zero-chill-bp'],
    // Ninja Set
    ['Ninja Kestrel', 'ninja-set'],
    // Templar BP (Kestrel Templar already in DB)
    // Unmapped sniper rifles — sort later
    ['Kestrel', 'unmapped'],
    ['Kestrel Retro', 'retro'],
    ['Kestrel Legacy', 'legacy'],
    ['Kestrel Feedkiller', 'feedkiller'],
    ['Kestrel Punisher', 'anti-cheat-bp'],
    ['Osprey', 'unmapped'],
    ['Osprey Retro', 'retro'],
    ['Osprey Legacy', 'legacy'],
    ['Pierser', 'unmapped'],
    ['Pierser Mouse', 'unmapped'],
    // ── Headwear ─────────────────────────────────────────
    // Hopper Pilot BP
    ['Hopper Pilot Helmet', 'hopper-pilot-bp'],
    // Drone Operator BP
    ['Drone Op Helmet', 'drone-op-bp'],
    // Cracker Jack
    ['Major Cracker Jack Helmet', 'cracker-jack'],
    // Enforcer BP
    ['Enforcer Helmet', 'enforcer-bp'],
    // Pink Fury BP
    ['Pink Fury Cap', 'pink-fury-bp'],
    // Mad Biker BP
    ['Mad Biker Helmet', 'mad-biker-bp'],
    // Black Friday BP
    ['Black Friday Helmet', 'black-friday-bp'],
    // Prankster
    ['Prankster Helmet', 'prankster'],
    // Player Zero
    ['Player Zero Cap', 'player-zero'],
    // Don DeLulu
    ['"Silence" Hat', 'don-delulu'],
    // Yankee Doodle
    ['Golden Yank Hat', 'yankee-doodle'],
    ['Silver Yank Hat', 'yankee-doodle'],
    // Hexmas
    ['Tweakle Toes Hat', 'hexmas'],
    ['Kush Kringle Hat', 'hexmas'],
    ['Nutkrakka Tinsel Hat', 'hexmas'],
    // ── Outerwear (Vests / Chest Rigs) ──────────────────
    // Pioneers
    ['Pioneer Tac Vest', 'pioneers'],
    // Player Zero
    ['Player Zero Chest Rig', 'player-zero'],
    // ChemTech BP
    ['Chemtech Vest', 'chemtech-bp'],
    // Hopper Pilot BP
    ['Hopper Pilot Tac Vest', 'hopper-pilot-bp'],
    // Drone Operator BP
    ['Drone Op Tactical Vest', 'drone-op-bp'],
    // Zero Chill BP
    ['Zero Chill Vest', 'zero-chill-bp'],
    // Enforcer BP
    ['Enforcer Vest', 'enforcer-bp'],
    ['Corporate Enforcer Tactical Vest', 'enforcer-bp'],
    // Pink Fury BP
    ['Pink Fury Tac Vest', 'pink-fury-bp'],
    // Mad Biker BP
    ['Mad Biker Vest', 'mad-biker-bp'],
    // Black Friday BP
    ['Black Friday Patrol Vest', 'black-friday-bp'],
    // Prankster
    ['Prankster Tac Vest', 'prankster'],
    // Don DeLulu
    ['"Silence" Tactical Vest', 'don-delulu'],
    // Cracker Jack
    ['Major Cracker Jack Tac Vest', 'cracker-jack'],
    // Hexmas
    ['Tweakle Toes Outerwear', 'hexmas'],
    // Mr Fuckles BP
    ['Gimp Restraint Kit', 'mr-fuckles-bp'],
    // ── Eyewear ─────────────────────────────────────────
    // Anarchist BP
    ['Anarchist Shades', 'anarchist-bp'],
    // Prankster
    ['Prankster Shades', 'prankster'],
    // Mad Biker BP
    ['Mad Biker Goggles', 'mad-biker-bp'],
    // Pink Fury BP
    ['Pink Fury Visor', 'pink-fury-bp'],
    // ChemTech BP
    ['Chemtech Goggles', 'chemtech-bp'],
    // Drone Operator BP
    ['Drone Op Goggles', 'drone-op-bp'],
    // Enforcer BP
    ['Enforcer Shades', 'enforcer-bp'],
    // Player Zero
    ['Player Zero Shades', 'player-zero'],
    // ── Facewear (Masks / Bandanas / Balaklavas) ────────
    // Combat DJ
    ['Combat DJ Helmet', 'combat-dj'],
    // Mr Fuckles BP
    ['Mr Fuckles Mask', 'mr-fuckles-bp'],
    ['Gimp Zipskin Mask', 'mr-fuckles-bp'],
    ['Techno Gimp Mask', 'mr-fuckles-bp'],
    // Player Zero
    ['Player Zero Mask', 'player-zero'],
    // Prankster
    ['Prankster Mask', 'prankster'],
    // Enforcer BP
    ['Corporate Enforcer Balaklava', 'enforcer-bp'],
    // Pioneers
    ['Pioneer Balaklava', 'pioneers'],
    // ALL-STARS
    ['All Stars Bandana', 'all-stars'],
    // Pink Fury BP
    ['Pink Fury Mask', 'pink-fury-bp'],
    // ChemTech BP
    ['Chemtech Mask', 'chemtech-bp'],
    // Zero Chill BP
    ['Zero Chill Mask', 'zero-chill-bp'],
    // Don DeLulu
    ['"Silence" Mask', 'don-delulu'],
    // Cracker Jack
    ['Major Cracker Jack Mask', 'cracker-jack'],
    // Halloween
    ['Smashkin Mask', 'halloween'],
    ['Sackrifice', 'halloween'],
    // ── LMGs (Hawk / Boomslang) + ARs (Partisan) ──────────────
    // Hawk
    ['Hawk', 'unmapped'],
    ['Hawk Retro', 'retro'],
    ['Hawk Legacy', 'legacy'],
    ['Hawk Feedkiller', 'feedkiller'],
    ['Hawk Cleanup Crew', 'unmapped'],
    // Hawk Anarchist already in Anarchist BP above
    // Hawk Blue Blood already in Hexmas above
    // Boomslang
    ['Boomslang', 'unmapped'],
    ['Boomslang Retro', 'retro'],
    ['Boomslang Legacy', 'legacy'],
    ['Boomslang Second Amender', 'save-democracy'],
    ['Boomslang Player Zero', 'player-zero'],
    // Partisan
    ['Partisan Raverunner', 'unmapped'],
    ['Partisan Le Boom-Boom', 'unmapped'],
    // ── SMGs (AZV 100 / Tacoma) ─────────────────────────────
    // AZV 100
    ['AZV 100', 'unmapped'],
    ['AZV 100 Retro', 'retro'],
    ['AZV 100 Legacy', 'legacy'],
    ['AZV 100 Doomed Zero', 'unmapped'],
    ['AZV 100 Pilot', 'hopper-pilot-bp'],
    // Tacoma
    ['Tacoma', 'unmapped'],
    ['Tacoma Retro', 'retro'],
    ['Tacoma Legacy', 'legacy'],
    ['Tacoma Avax Gen 04', 'unmapped'],
    ['Tacoma Pioneer', 'pioneers'],
    ['Tacoma Westcol', 'westcol'],
    // Tacoma Blue Blood already in Hexmas above
    // Tacoma Yubikiri already in Hitori Yubi BP above
    // ── Shotguns (Flenser / Influencer / Squall) ──────────────
    // Flenser
    ['Flenser', 'unmapped'],
    ['Flenser Retro', 'retro'],
    ['Flenser Legacy', 'legacy'],
    ['Flenser Chemtech', 'chemtech-bp'],
    // Flenser Mad Biker already in Mad Biker BP above
    // Influencer
    ['Influencer', 'unmapped'],
    ['Influencer TBI Blitzbringer', 'the-comeback'],
    // Squall
    ['Squall', 'unmapped'],
    ['Squall Retro', 'retro'],
    ['Squall Legacy', 'legacy'],
    ['Squall LayerZero', 'unmapped'],
    ['Squall Combat DJ', 'combat-dj'],
    ['Squall Honksplatter', 'unmapped'],
    ['Squall Feedkiller', 'feedkiller'],
    // ── Emotes ──────────────────────────────────────────────────
    // Hexmas
    ['Snow and Blow', 'hexmas'],
    ['Jingle and Twitch', 'hexmas'],
    // Hitori Yubi BP
    ['Yubi Flex', 'hitori-yubi-bp'],
    // The Comeback
    ['The Blitz Down', 'the-comeback'],
    // Don DeLulu
    ["Heads, You're Liquidated.", 'don-delulu'],
    // Halloween
    ['Hopping Vampyre Emote', 'halloween'],
    // Westcol
    ['Westcol Till I Die', 'westcol'],
    // Save Democracy
    ['Firework Farts & Freedom', 'save-democracy'],
    // Already mapped: Going Apeshit, Hump for Dominance (aperil-fools-cp)
    // Already mapped: Sleigh Queen (mrs-crackhead-santa)
    // Unmapped emotes
    ['Light the Fire', 'unmapped'],
    ["Keep 'Em Out", 'unmapped'],
    ['Trauma Five', 'unmapped'],
    ['Hug Me', 'unmapped'],
    ['Convulsions Emote', 'unmapped'],
    ['Slow Rise Emote', 'unmapped'],
    ['Occupational Hazard', 'unmapped'],
    ['Hot Licks', 'unmapped'],
    ['Blackout', 'unmapped'],
    ['Toss My Fruit Salad', 'unmapped'],
    ['Permaban', 'unmapped'],
    ['The Hover Touch', 'unmapped'],
    ["Eagle's Cry", 'unmapped'],
    ['Circus Inferno', 'unmapped'],
    ['Stuff That', 'unmapped'],
    ['Meat Puppet', 'unmapped'],
    ['Neck Snap Emote', 'unmapped'],
    ['Broken Puppet Emote', 'unmapped'],
    ['RMA Rampage', 'unmapped'],
    ['Cold Snap', 'unmapped'],
    ['No Pulse', 'unmapped'],
    ['Impact Replay', 'unmapped'],
    ['Circuit Breaker', 'unmapped'],
    ['Karmacide', 'unmapped'],
    ['Techno Tantrum', 'unmapped'],
    ['Salute and Execute', 'unmapped'],
    ['I Want Your Cyberlimbs', 'unmapped'],
    ['Zero Aura', 'unmapped'],
    ['Moonwalk', 'unmapped'],
    ['Battle Break', 'unmapped'],
    ["You Can't See Me", 'unmapped'],
    ['Red Carded', 'unmapped'],
    ['Fire and Flex', 'unmapped'],
    ['Emergency Ejection', 'unmapped'],
    ['Rage Quitter', 'unmapped'],
    ['Boogie Down', 'unmapped'],
    ['Final Maul', 'unmapped'],
    ['Two Finger Salute', 'unmapped'],
    ['Bagged and Tagged', 'unmapped'],
    ['The Flip Maul', 'unmapped'],
    ['The Point and Punish', 'unmapped'],
    ['Robo Grind', 'unmapped'],
    ['Bow Before the Beaten', 'unmapped'],
    ["Hear That, B*tch?", 'unmapped'],
    ['Flip the Salute', 'unmapped'],
    ['Give Peace a Chance', 'unmapped'],
    ['Throne of Games', 'unmapped'],
    // ── Profile Banners ─────────────────────────────────────────
    // Hopper Pilot BP
    ['Dead Pilot', 'hopper-pilot-bp'],
    // Save Democracy
    ['Taste of Freedom', 'save-democracy'],
    // Mr Fuckles BP
    ['Ballgag Beat', 'mr-fuckles-bp'],
    ['Big Top Beat', 'mr-fuckles-bp'],
    // Black Friday BP
    ['Bargain Beat', 'black-friday-bp'],
    // Hexmas
    ['Merry Glitchmas', 'hexmas'],
    // Unmapped banners
    ['Love My Limbs', 'unmapped'],
    ['Respawn Wheel', 'unmapped'],
    ['Tagged for Death', 'unmapped'],
    ['No Country for Cheaters', 'unmapped'],
    ["I'll Fly Before You Die", 'unmapped'],
    ['Do or Die', 'unmapped'],
    ['Fried Ass', 'unmapped'],
    ['Face of Death', 'unmapped'],
    ['Welcome to the Circle', 'unmapped'],
    ['Spreading the Hurt', 'unmapped'],
    ['Cyber Grinder', 'unmapped'],
    ['Cybernetic Dreams', 'unmapped'],
    ['Population Control', 'unmapped'],
    ['One-Way Ticket to the Fight', 'unmapped'],
    ['Move to Live', 'unmapped'],
    ['The Last Dance', 'unmapped'],
    ['Snakes in the Sky', 'unmapped'],
    // ── Music / Glykobitz ───────────────────────────────────────
    // Hexmas (new variants not already in seed)
    ['Glykobitz - Sleigh Bitch, Big Band Edition', 'hexmas'],
    ["Glykobitz - Jingle T**s", 'hexmas'],
    ['Glykobitz - Meth the Halls', 'hexmas'],
    // Already mapped: Carol of the Damned, Maul Cop, North Pole Pussy, Santa Pay Me,
    //   Sleigh Bitch, It's Beginning to Look a Lot Like Teardrop, Meth Made
    // Unmapped music
    ['First Spin', 'unmapped'],
    ['Meatport - Enter the Grid', 'unmapped'],
  ];

  let itemCount = 0;
  for (const [name, releaseSlug] of items) {
    const itemName = name.toLowerCase();
    await prisma.itemOriginItem.upsert({
      where: { itemName_quality: { itemName, quality: '' } },
      update: { releaseSlug },
      create: { itemName, releaseSlug },
    });
    itemCount++;
  }
  console.log(`  Items: ${itemCount} upserted`);

  // --- Item Origin Match Rules ---
  const matchRules: Array<{ type: string; pattern: string; releaseSlug: string; priority: number }> = [
    // Prefix rules (higher priority — evaluated first)
    { type: 'prefix', pattern: 'candy coater for the',   releaseSlug: 'hexmas',              priority: 100 },
    { type: 'prefix', pattern: 'present tense for the',  releaseSlug: 'hexmas',              priority: 101 },
    { type: 'prefix', pattern: 'glykobitz',              releaseSlug: 'hexmas',              priority: 102 },
    { type: 'prefix', pattern: 'black friday',           releaseSlug: 'black-friday-bp',     priority: 103 },
    { type: 'prefix', pattern: 'hopper pilot',           releaseSlug: 'hopper-pilot-bp',     priority: 104 },
    { type: 'prefix', pattern: 'mad biker',              releaseSlug: 'mad-biker-bp',        priority: 105 },
    { type: 'prefix', pattern: 'enforcer',               releaseSlug: 'enforcer-bp',         priority: 106 },
    { type: 'prefix', pattern: 'corporate enforcer',     releaseSlug: 'enforcer-bp',         priority: 107 },
    { type: 'prefix', pattern: 'pink fury',              releaseSlug: 'pink-fury-bp',        priority: 108 },
    { type: 'prefix', pattern: 'mr fuckles',             releaseSlug: 'mr-fuckles-bp',       priority: 109 },
    // Contains rules (lower priority)
    { type: 'contains', pattern: 'westcol',              releaseSlug: 'westcol',             priority: 10 },
    { type: 'contains', pattern: 'neotokyo',             releaseSlug: 'neotokyo',            priority: 11 },
    { type: 'contains', pattern: 'red monster',          releaseSlug: 'halloween',           priority: 12 },
    { type: 'contains', pattern: 'feral beast',          releaseSlug: 'halloween',           priority: 13 },
    { type: 'contains', pattern: 'grey monster',         releaseSlug: 'halloween',           priority: 14 },
    { type: 'contains', pattern: 'il silenzio',          releaseSlug: 'don-delulu',          priority: 15 },
    { type: 'contains', pattern: 'don delulu',           releaseSlug: 'don-delulu',          priority: 16 },
    { type: 'contains', pattern: 'rose gold',            releaseSlug: 'don-delulu',          priority: 17 },
    { type: 'contains', pattern: 'goldchain',            releaseSlug: 'don-delulu',          priority: 18 },
    { type: 'contains', pattern: "you're liquidated",    releaseSlug: 'don-delulu',          priority: 19 },
    { type: 'contains', pattern: 'crackhead santa',      releaseSlug: 'mrs-crackhead-santa', priority: 20 },
    { type: 'contains', pattern: 'sleigh queen',         releaseSlug: 'mrs-crackhead-santa', priority: 21 },
    { type: 'contains', pattern: 'ms santa slay',        releaseSlug: 'mrs-crackhead-santa', priority: 22 },
    { type: 'contains', pattern: 'nutkrakka',            releaseSlug: 'mrs-crackhead-santa', priority: 23 },
    { type: 'contains', pattern: 'solana',               releaseSlug: 'solana-set',          priority: 7 },
    { type: 'contains', pattern: 'legacy',               releaseSlug: 'legacy',              priority: 5 },
    { type: 'contains', pattern: 'retro',                releaseSlug: 'retro',               priority: 4 },
    { type: 'contains', pattern: 'punisher',             releaseSlug: 'anti-cheat-bp',       priority: 6 },
    { type: 'contains', pattern: 'feedkiller',           releaseSlug: 'feedkiller',          priority: 7 },
  ];

  for (const rule of matchRules) {
    await prisma.itemOriginMatchRule.upsert({
      where: { type_pattern: { type: rule.type, pattern: rule.pattern } },
      update: { releaseSlug: rule.releaseSlug, priority: rule.priority },
      create: rule,
    });
  }
  console.log(`  Match Rules: ${matchRules.length} upserted\n`);

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
