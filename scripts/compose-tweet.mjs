/**
 * Compose Tweet from Latest Update
 *
 * Reads lib/data/updates.ts, extracts the latest entry (tag: 'current'),
 * and outputs a tweet-ready string to stdout.
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

// Extract the UPDATES array entries using regex
// Each entry: { version: '...', date: '...', tag?: '...', title?: '...', items: [...] }
const entryRegex = /\{\s*version:\s*'([^']+)',\s*date:\s*'([^']+)',\s*(?:tag:\s*'([^']*)',\s*)?(?:title:\s*'([^']*)',\s*)?items:\s*\[([\s\S]*?)\],?\s*\}/g;

let latestEntry = null;
let match;

while ((match = entryRegex.exec(source)) !== null) {
  const [, version, date, tag, title, itemsBlock] = match;
  if (tag === 'current' || !latestEntry) {
    // Extract individual items from the items array
    const items = [];
    const itemRegex = /'((?:[^'\\]|\\.)*)'/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
      // Unescape unicode sequences and special chars
      items.push(itemMatch[1]
        .replace(/\\u2011/g, '\u2011')
        .replace(/\\u2014/g, '\u2014')
        .replace(/\\u2019/g, '\u2019')
        .replace(/\\u2013/g, '\u2013')
        .replace(/\\n/g, '\n')
      );
    }
    latestEntry = { version, date, tag, title, items };
    if (tag === 'current') break;
  }
}

if (!latestEntry) {
  console.error('No update entry found in updates.ts');
  process.exit(1);
}

const { version, title, items } = latestEntry;
const site = 'https://gunzscope.xyz';

// Compose tweet: title + bullet points (trimmed to fit 280 chars)
let tweet = '';

if (title) {
  tweet += `${title}\n\n`;
}

tweet += `${version} is live:\n`;

// Add items as bullet points, truncating if needed
for (const item of items) {
  // Take first sentence of each item
  const firstSentence = item.split(/(?<=[.!?])\s/)[0];
  // Trim long sentences
  const trimmed = firstSentence.length > 120
    ? firstSentence.slice(0, 117) + '...'
    : firstSentence;
  const candidate = tweet + `\u2022 ${trimmed}\n`;
  // Leave room for the URL (23 chars for t.co + newline)
  if (candidate.length + 24 > 280) break;
  tweet = candidate;
}

tweet += `\n${site}`;

// Final safety: hard-truncate at 280 (t.co shortens URLs to 23 chars)
if (tweet.length > 280) {
  tweet = tweet.slice(0, 277) + '...';
}

const output = {
  text: tweet,
  version: latestEntry.version,
  title: latestEntry.title || '',
};

console.log(JSON.stringify(output));
