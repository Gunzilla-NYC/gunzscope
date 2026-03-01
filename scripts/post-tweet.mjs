/**
 * Post Tweet via Twitter API v2
 *
 * Uses OAuth 1.0a User Context to post a tweet.
 * No external dependencies — uses Node.js built-in crypto.
 *
 * Required env vars:
 *   TWITTER_API_KEY          — Consumer Key
 *   TWITTER_API_SECRET       — Consumer Secret
 *   TWITTER_ACCESS_TOKEN     — Access Token
 *   TWITTER_ACCESS_SECRET    — Access Token Secret
 *
 * Usage:
 *   echo '{"text":"Hello world"}' | node scripts/post-tweet.mjs
 *   node scripts/post-tweet.mjs --dry-run < tweet.json
 */

import { createHmac, randomBytes } from 'crypto';

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

  // Build signature base string
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

// ── Main ─────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');

// Read tweet JSON from stdin
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString());

if (!input.text) {
  console.error('Error: No tweet text provided');
  process.exit(1);
}

console.error(`Tweet (${input.text.length}/280 chars):`);
console.error(input.text);
console.error('---');

if (isDryRun) {
  console.error('[DRY RUN] Would post the above tweet.');
  console.log(JSON.stringify({ dry_run: true, text: input.text }));
  process.exit(0);
}

// Validate env vars
const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;

if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
  console.error('Error: Missing Twitter API credentials. Required env vars:');
  console.error('  TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET');
  process.exit(1);
}

const authHeader = buildOAuthHeader({
  method: 'POST',
  url: TWITTER_API_URL,
  consumerKey: TWITTER_API_KEY,
  consumerSecret: TWITTER_API_SECRET,
  token: TWITTER_ACCESS_TOKEN,
  tokenSecret: TWITTER_ACCESS_SECRET,
});

const response = await fetch(TWITTER_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: input.text }),
});

const body = await response.json();

if (!response.ok) {
  console.error(`Twitter API error (${response.status}):`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.error(`Tweet posted! ID: ${body.data?.id}`);
console.log(JSON.stringify(body));
