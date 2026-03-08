/**
 * Compose Tweet Thread from Latest Update
 *
 * Reads lib/data/updates.ts, extracts the latest entry (tag: 'current'),
 * and generates a tweet thread.
 *
 * If ANTHROPIC_API_KEY is set, uses Claude to draft a punchy thread
 * matching GUNZscope's voice (dry sarcasm, no emoji, no corporate speak).
 * Otherwise, falls back to a simple chunked format.
 *
 * Usage:
 *   node scripts/compose-tweet.mjs              # drafts thread for tag:'current'
 *   node scripts/compose-tweet.mjs --version v0.7.0  # drafts thread for specific version
 *
 * Output: JSON { thread: ["tweet1", "tweet2", ...], version, title }
 *
 * Legacy compat: also outputs { text } with the full thread joined by \n---\n
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const updatesPath = resolve(__dirname, '../lib/data/updates.ts');
const source = readFileSync(updatesPath, 'utf-8');

// ── CLI args ─────────────────────────────────────────────────────
const targetVersion = process.argv.includes('--version')
  ? process.argv[process.argv.indexOf('--version') + 1]
  : null;

// ── Parse updates.ts ─────────────────────────────────────────────
const entryRegex = /\{\s*version:\s*'([^']+)',\s*date:\s*'([^']+)',\s*(?:tag:\s*'([^']*)',\s*)?(?:title:\s*'([^']*)',\s*)?items:\s*\[([\s\S]*?)\],?\s*\}/g;

let latestEntry = null;
let match;

while ((match = entryRegex.exec(source)) !== null) {
  const [, version, date, tag, title, itemsBlock] = match;

  // If --version specified, match exactly; otherwise pick tag:'current' or first
  const isTarget = targetVersion
    ? version === targetVersion
    : (tag === 'current' || !latestEntry);

  if (isTarget) {
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
    if (targetVersion || tag === 'current') break;
  }
}

if (!latestEntry) {
  console.error(targetVersion
    ? `No update entry found for version "${targetVersion}"`
    : 'No update entry found in updates.ts');
  process.exit(1);
}

// ── Claude API Thread Generation ────────────────────────────────
async function generateThreadWithClaude(entry) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are the social media voice for GUNZscope, a multi-chain portfolio tracker for the Off The Grid gaming ecosystem.

Voice rules:
- Dry sarcasm, deadpan humor. Self-deprecating about bugs.
- Direct second-person ("your", "you"), never "users can now"
- No emoji. No exclamation marks (except sarcastic). No corporate speak.
- Short punchy sentences. Sentence fragments OK.
- Plain English — no jargon like "middleware", "JWT", "soft delete"
- Reference @playoffthegrid or @GunzillaGames naturally when relevant
- End the thread with a link to https://gunzscope.xyz

Here is the latest update entry:

Version: ${entry.version}
Title: ${entry.title || '(no title)'}
Date: ${entry.date}

Items:
${entry.items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Write a Twitter/X thread of 4-5 tweets. Each tweet must be under 280 characters. Number them like "1/" at the start. The first tweet should hook — lead with the title or a punchy one-liner, not the version number. The last tweet should include the URL and optionally tag relevant accounts.

Return ONLY the tweets, one per line, separated by blank lines. No markdown, no labels, no explanations.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Claude API error (${res.status}): ${err}`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    // Parse tweets — split by blank lines, filter empty
    const tweets = text
      .split(/\n\s*\n/)
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length <= 280);

    if (tweets.length < 2) return null;
    return tweets;
  } catch (err) {
    console.error(`Claude API call failed: ${err.message}`);
    return null;
  }
}

// ── Fallback: Simple Chunked Thread ─────────────────────────────
function generateFallbackThread(entry) {
  const { version, title, items } = entry;
  const site = 'https://gunzscope.xyz';
  const tweets = [];

  // Tweet 1: hook
  const hook = title
    ? `1/ ${version} \u2014 ${title}`
    : `1/ ${version} is live.`;
  tweets.push(hook);

  // Middle tweets: one per item, truncated to 280
  items.forEach((item, i) => {
    const prefix = `${i + 2}/ `;
    const firstSentence = item.split(/(?<=[.!?])\s/)[0];
    const maxLen = 280 - prefix.length;
    const body = firstSentence.length > maxLen
      ? firstSentence.slice(0, maxLen - 3) + '...'
      : firstSentence;
    tweets.push(`${prefix}${body}`);
  });

  // Final tweet: CTA
  tweets.push(`${tweets.length + 1}/ ${site}`);

  return tweets;
}

// ── Main ────────────────────────────────────────────────────────
const claudeThread = await generateThreadWithClaude(latestEntry);
const thread = claudeThread || generateFallbackThread(latestEntry);

const output = {
  thread,
  text: thread.join('\n\n---\n\n'), // legacy compat for single-post workflows
  version: latestEntry.version,
  title: latestEntry.title || '',
};

console.log(JSON.stringify(output));
