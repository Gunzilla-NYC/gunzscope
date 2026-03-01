/**
 * Compose Tweet from Latest Update
 *
 * Reads lib/data/updates.ts, extracts the latest entry (tag: 'current'),
 * and outputs a tweet-ready string to stdout.
 *
 * Features:
 * - Unicode bold for key terms (Off The Grid, GUNZscope vX.X.X)
 * - Relevant ecosystem account tags
 * - Auto-formats from updates.ts data
 *
 * Usage: node scripts/compose-tweet.mjs
 * Output: JSON { text: "...", version: "...", title: "..." }
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const updatesPath = resolve(__dirname, '../lib/data/updates.ts');
const source = readFileSync(updatesPath, 'utf-8');

// ── Unicode Bold Mapping ─────────────────────────────────────────
// Twitter doesn't support markdown — use Mathematical Bold Unicode
const BOLD_MAP = {};
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('').forEach((c, i) => {
  if (i < 26) BOLD_MAP[c] = String.fromCodePoint(0x1D400 + i);           // A-Z
  else if (i < 52) BOLD_MAP[c] = String.fromCodePoint(0x1D41A + (i - 26)); // a-z
  else BOLD_MAP[c] = String.fromCodePoint(0x1D7CE + (i - 52));            // 0-9
});
BOLD_MAP[' '] = ' ';
BOLD_MAP['.'] = '.';
BOLD_MAP['-'] = '-';
BOLD_MAP['\u2011'] = '\u2011'; // non-breaking hyphen

function toBold(str) {
  return str.split('').map(c => BOLD_MAP[c] || c).join('');
}

// Terms to auto-bold in tweet text
const BOLD_TERMS = [
  'Off The Grid',
  'Off\u2011The\u2011Grid',
  'GUNZscope',
  'Avalanche',
  'GunzChain',
  'C-Chain',
  'C\u2011Chain',
  'on-chain',
  'on\u2011chain',
];

function applyBold(text, version) {
  let result = text;
  // Bold the version string (e.g., "GUNZscope v0.4.4")
  const versionPattern = `GUNZscope ${version}`;
  if (result.includes(versionPattern)) {
    result = result.replace(versionPattern, toBold(versionPattern));
  } else {
    // Bold version alone if combined form not found
    result = result.replace(version, toBold(version));
    // Bold GUNZscope separately
    result = result.replace(/GUNZscope/g, toBold('GUNZscope'));
  }
  // Bold key terms (longest first to avoid partial matches)
  for (const term of BOLD_TERMS.sort((a, b) => b.length - a.length)) {
    // Skip if already bolded (contains bold chars)
    result = result.split(term).join(toBold(term));
  }
  return result;
}

// ── Ecosystem Accounts ───────────────────────────────────────────
// Tagged contextually based on tweet content
const ACCOUNT_TAGS = [
  { handle: '@playoffthegrid', keywords: ['Off The Grid', 'OTG', 'game'] },
  { handle: '@GunzillaGames', keywords: ['Off The Grid', 'OTG', 'game', 'NFT'] },
  { handle: '@GUNbyGUNZ', keywords: ['GUN', 'token', 'price', 'market'] },
  { handle: '@AvalancheFDN', keywords: ['Avalanche', 'C-Chain', 'on-chain', 'attestation'] },
  { handle: '@solanagaming', keywords: ['Solana', 'multi-chain'] },
];

function getRelevantTags(text) {
  const lower = text.toLowerCase();
  return ACCOUNT_TAGS
    .filter(t => t.keywords.some(kw => lower.includes(kw.toLowerCase())))
    .map(t => t.handle);
}

// ── Parse updates.ts ─────────────────────────────────────────────
const entryRegex = /\{\s*version:\s*'([^']+)',\s*date:\s*'([^']+)',\s*(?:tag:\s*'([^']*)',\s*)?(?:title:\s*'([^']*)',\s*)?items:\s*\[([\s\S]*?)\],?\s*\}/g;

let latestEntry = null;
let match;

while ((match = entryRegex.exec(source)) !== null) {
  const [, version, date, tag, title, itemsBlock] = match;
  if (tag === 'current' || !latestEntry) {
    const items = [];
    const itemRegex = /'((?:[^'\\]|\\.)*)'/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
      items.push(itemMatch[1]
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\n/g, '\n')
      );
    }
    const cleanTitle = title
      ? title.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      : undefined;
    latestEntry = { version, date, tag, title: cleanTitle, items };
    if (tag === 'current') break;
  }
}

if (!latestEntry) {
  console.error('No update entry found in updates.ts');
  process.exit(1);
}

// ── Compose Tweet ────────────────────────────────────────────────
const { version, title, items } = latestEntry;
const site = 'https://gunzscope.xyz';

let tweet = '';

if (title) {
  tweet += `${title}\n\n`;
}

tweet += `${toBold(`GUNZscope ${version}`)} \u2014 `;

// Add first item's first sentence as the description
if (items.length > 0) {
  const firstSentence = items[0].split(/(?<=[.!?])\s/)[0];
  const trimmed = firstSentence.length > 140
    ? firstSentence.slice(0, 137) + '...'
    : firstSentence;
  tweet += trimmed;
}

// Add relevant account tags
const allText = `${title || ''} ${items.join(' ')}`;
const tags = getRelevantTags(allText);
if (tags.length > 0) {
  tweet += `\n\n${tags.join(' ')}`;
}

tweet += `\n\n${site}`;

// Apply bold formatting to the body (not to @handles or URLs)
// We bold the title and description parts, tags/URL stay plain
const lines = tweet.split('\n');
const formatted = lines.map(line => {
  // Don't bold lines that are URLs or @mentions
  if (line.startsWith('http') || line.startsWith('@')) return line;
  return applyBold(line, version);
}).join('\n');

// Final safety: Twitter counts t.co URLs as 23 chars
const output = {
  text: formatted,
  version: latestEntry.version,
  title: latestEntry.title || '',
};

console.log(JSON.stringify(output));
