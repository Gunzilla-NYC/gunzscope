/**
 * Post Tweet Thread via Twitter API v2
 *
 * Uses OAuth 1.0a User Context to post a thread (reply chain).
 * No external dependencies — uses Node.js built-in crypto.
 *
 * Required env vars:
 *   TWITTER_API_KEY          — Consumer Key
 *   TWITTER_API_SECRET       — Consumer Secret
 *   TWITTER_ACCESS_TOKEN     — Access Token
 *   TWITTER_ACCESS_SECRET    — Access Token Secret
 *
 * Input (stdin): JSON with either:
 *   { thread: ["tweet1", "tweet2", ...] }   — threaded reply chain
 *   { text: "single tweet" }                — legacy single tweet
 *
 * Usage:
 *   echo '{"thread":["1/ hello","2/ world"]}' | node scripts/post-tweet.mjs
 *   node scripts/post-tweet.mjs --dry-run < thread.json
 */

import { createHmac, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env.local so credentials work without inline env vars
(function loadEnv() {
  try {
    const lines = readFileSync(resolve(root, '.env.local'), 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      let val = trimmed.slice(eqIdx + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local optional if env vars already set */ }
})();

const TWITTER_API_URL = 'https://api.twitter.com/2/tweets';

// ── OAuth 1.0a Signing ──────────────────────────────────────────────

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function buildOAuthHeader({ method, url, consumerKey, consumerSecret, token, tokenSecret }) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  const header = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return header;
}

// ── Post a single tweet (optionally as a reply) ─────────────────────

async function postTweet(text, replyToId = null) {
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;

  const authHeader = buildOAuthHeader({
    method: 'POST',
    url: TWITTER_API_URL,
    consumerKey: TWITTER_API_KEY,
    consumerSecret: TWITTER_API_SECRET,
    token: TWITTER_ACCESS_TOKEN,
    tokenSecret: TWITTER_ACCESS_SECRET,
  });

  const body = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  const response = await fetch(TWITTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Twitter API error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

// ── Main ─────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');

// Read JSON from stdin
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString());

// Normalize to thread array
const thread = input.thread || [input.text];

if (!thread.length || !thread[0]) {
  console.error('Error: No tweet text provided');
  process.exit(1);
}

// Validate all tweets
for (let i = 0; i < thread.length; i++) {
  if (thread[i].length > 280) {
    console.error(`Error: Tweet ${i + 1} exceeds 280 chars (${thread[i].length})`);
    process.exit(1);
  }
}

// Preview
console.error(`Thread (${thread.length} tweets):`);
thread.forEach((t, i) => {
  console.error(`  [${i + 1}/${thread.length}] (${t.length}/280) ${t.slice(0, 80)}${t.length > 80 ? '...' : ''}`);
});
console.error('---');

if (isDryRun) {
  console.error('[DRY RUN] Would post the above thread.');
  console.log(JSON.stringify({ dry_run: true, thread }));
  process.exit(0);
}

// Validate env vars
const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;

if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
  console.error('Error: Missing Twitter API credentials. Required env vars:');
  console.error('  TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET');
  process.exit(1);
}

// Post thread as reply chain
const posted = [];
let lastId = null;

for (let i = 0; i < thread.length; i++) {
  const result = await postTweet(thread[i], lastId);
  lastId = result.data?.id;
  posted.push({ index: i + 1, id: lastId, text: thread[i] });
  console.error(`  Posted ${i + 1}/${thread.length} (ID: ${lastId})`);

  // Small delay between tweets to avoid rate limits
  if (i < thread.length - 1) {
    await new Promise(r => setTimeout(r, 1000));
  }
}

console.error(`Thread posted! First tweet ID: ${posted[0].id}`);
console.log(JSON.stringify({ thread: posted }));
