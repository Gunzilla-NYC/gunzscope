#!/usr/bin/env node
/**
 * Interactive Tweet CLI
 *
 * Preview, edit, and post tweet threads from your terminal.
 * Reads the latest update from lib/data/updates.ts, drafts a thread
 * via Claude (or fallback), and lets you review before posting.
 *
 * Usage:
 *   node scripts/tweet.mjs                  # interactive flow
 *   node scripts/tweet.mjs --version v0.7.1 # specific version
 *   node scripts/tweet.mjs --dry-run        # skip the post step
 *
 * Requires .env.local with:
 *   ANTHROPIC_API_KEY (optional — for Claude-drafted threads)
 *   TWITTER_API_KEY, TWITTER_API_SECRET,
 *   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { createHmac, randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(root, '.env.local');
  try {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      let val = trimmed.slice(eqIdx + 1);
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local is optional if env vars are already set
  }
}
loadEnv();

// ── CLI args ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const versionIdx = args.indexOf('--version');
const targetVersion = versionIdx !== -1 ? args[versionIdx + 1] : null;

// ── Readline helpers ─────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stderr });
const ask = (q) => new Promise(r => rl.question(q, r));

function printThread(thread) {
  console.error('');
  console.error('\x1b[36m┌─ Thread Preview ─────────────────────────────────\x1b[0m');
  thread.forEach((t, i) => {
    const len = t.length;
    const color = len > 270 ? '\x1b[31m' : len > 250 ? '\x1b[33m' : '\x1b[32m';
    console.error(`\x1b[36m│\x1b[0m`);
    console.error(`\x1b[36m│\x1b[0m  \x1b[1mTweet ${i + 1}/${thread.length}\x1b[0m  ${color}(${len}/280)\x1b[0m`);
    // Wrap long lines for readability
    const lines = t.split('\n');
    for (const line of lines) {
      console.error(`\x1b[36m│\x1b[0m  ${line}`);
    }
  });
  console.error(`\x1b[36m│\x1b[0m`);
  console.error('\x1b[36m└──────────────────────────────────────────────────\x1b[0m');
  console.error('');
}

// ── Parse updates.ts ─────────────────────────────────────────────
function parseLatestUpdate() {
  const updatesPath = resolve(root, 'lib/data/updates.ts');
  const source = readFileSync(updatesPath, 'utf-8');

  const entryRegex = /\{\s*version:\s*'([^']+)',\s*date:\s*'([^']+)',\s*(?:tag:\s*'([^']*)',\s*)?(?:title:\s*'([^']*)',\s*)?items:\s*\[([\s\S]*?)\],?\s*\}/g;
  let latestEntry = null;
  let match;

  while ((match = entryRegex.exec(source)) !== null) {
    const [, version, date, tag, title, itemsBlock] = match;
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
  return latestEntry;
}

// ── Claude API ───────────────────────────────────────────────────
async function generateThreadWithClaude(entry) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  console.error('\x1b[90mDrafting thread with Claude...\x1b[0m');

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
      console.error(`\x1b[33mClaude API error (${res.status}) — falling back to simple format\x1b[0m`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const tweets = text.split(/\n\s*\n/).map(t => t.trim()).filter(t => t.length > 0 && t.length <= 280);
    if (tweets.length < 2) return null;

    console.error(`\x1b[32mClaude drafted ${tweets.length} tweets\x1b[0m`);
    return tweets;
  } catch (err) {
    console.error(`\x1b[33mClaude API failed: ${err.message} — falling back\x1b[0m`);
    return null;
  }
}

// ── Fallback thread ──────────────────────────────────────────────
function generateFallbackThread(entry) {
  const { version, title, items } = entry;
  const tweets = [];
  tweets.push(title ? `1/ ${version} \u2014 ${title}` : `1/ ${version} is live.`);
  items.forEach((item, i) => {
    const prefix = `${i + 2}/ `;
    const firstSentence = item.split(/(?<=[.!?])\s/)[0];
    const maxLen = 280 - prefix.length;
    const body = firstSentence.length > maxLen ? firstSentence.slice(0, maxLen - 3) + '...' : firstSentence;
    tweets.push(`${prefix}${body}`);
  });
  tweets.push(`${tweets.length + 1}/ https://gunzscope.xyz`);
  return tweets;
}

// ── Twitter OAuth 1.0a ───────────────────────────────────────────
function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
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

  const paramString = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`).join('&');

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&');
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  oauthParams.oauth_signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(', ');
}

// ── Twitter Media Upload (v1.1) ──────────────────────────────────
const THREAD_END_IMAGE = resolve(root, 'public/images/thread-end.png');

function getOAuthCreds() {
  return {
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET,
    token: process.env.TWITTER_ACCESS_TOKEN,
    tokenSecret: process.env.TWITTER_ACCESS_SECRET,
  };
}

async function uploadMedia(filePath) {
  const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
  const imageData = readFileSync(filePath);
  const base64 = imageData.toString('base64');

  const authHeader = buildOAuthHeader({
    method: 'POST', url: UPLOAD_URL, ...getOAuthCreds(),
  });

  // Use multipart/form-data with base64 media_data
  const boundary = '----TwitterUpload' + randomBytes(8).toString('hex');
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${base64}\r\n`,
    `--${boundary}--\r\n`,
  ];
  const bodyStr = bodyParts.join('');

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyStr,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Media upload error (${response.status}): ${JSON.stringify(data)}`);
  return data.media_id_string;
}

async function postTweet(text, replyToId = null, mediaId = null) {
  const TWITTER_API_URL = 'https://api.twitter.com/2/tweets';
  const authHeader = buildOAuthHeader({
    method: 'POST', url: TWITTER_API_URL, ...getOAuthCreds(),
  });

  const body = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
  if (mediaId) body.media = { media_ids: [mediaId] };

  const response = await fetch(TWITTER_API_URL, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Twitter API error (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  // 1. Parse update
  const entry = parseLatestUpdate();
  if (!entry) {
    console.error(targetVersion
      ? `No update entry found for "${targetVersion}"`
      : 'No update entry with tag:"current" found in updates.ts');
    process.exit(1);
  }

  console.error(`\x1b[1mGUNZscope Tweet CLI\x1b[0m`);
  console.error(`\x1b[90mVersion: ${entry.version} | ${entry.title || '(no title)'} | ${entry.date}\x1b[0m`);

  // 2. Generate thread
  let thread = await generateThreadWithClaude(entry) || generateFallbackThread(entry);
  printThread(thread);

  // 3. Interactive loop
  let done = false;
  while (!done) {
    const action = (await ask(
      '\x1b[1m[p]\x1b[0most  \x1b[1m[r]\x1b[0megenerate  \x1b[1m[e]\x1b[0mdit tweet  \x1b[1m[d]\x1b[0melete tweet  \x1b[1m[a]\x1b[0mdd tweet  \x1b[1m[q]\x1b[0muit > '
    )).trim().toLowerCase();

    switch (action) {
      case 'p': {
        if (isDryRun) {
          console.error('\x1b[33m[DRY RUN] Would post the above thread.\x1b[0m');
          console.log(JSON.stringify({ dry_run: true, thread }));
          done = true;
          break;
        }

        // Check credentials
        const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;
        if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
          console.error('\x1b[31mMissing Twitter credentials in .env.local\x1b[0m');
          break;
        }

        // Validate lengths
        const tooLong = thread.findIndex(t => t.length > 280);
        if (tooLong !== -1) {
          console.error(`\x1b[31mTweet ${tooLong + 1} exceeds 280 chars (${thread[tooLong].length}). Edit it first.\x1b[0m`);
          break;
        }

        const confirm = (await ask('\x1b[33mPost this thread for real? (y/n) \x1b[0m')).trim().toLowerCase();
        if (confirm !== 'y') break;

        // Upload end-of-thread image
        let endCardMediaId = null;
        try {
          const { existsSync } = await import('fs');
          if (existsSync(THREAD_END_IMAGE)) {
            console.error('\x1b[90mUploading end-of-thread card...\x1b[0m');
            endCardMediaId = await uploadMedia(THREAD_END_IMAGE);
            console.error(`  \x1b[32mImage uploaded\x1b[0m (media_id: ${endCardMediaId})`);
          }
        } catch (err) {
          console.error(`  \x1b[33mImage upload failed: ${err.message} — posting without image\x1b[0m`);
        }

        // Post
        console.error('\x1b[90mPosting...\x1b[0m');
        let lastId = null;
        for (let i = 0; i < thread.length; i++) {
          const isLast = i === thread.length - 1;
          try {
            const result = await postTweet(thread[i], lastId, isLast ? endCardMediaId : null);
            lastId = result.data?.id;
            console.error(`  \x1b[32mPosted ${i + 1}/${thread.length}\x1b[0m (ID: ${lastId})${isLast && endCardMediaId ? ' + image' : ''}`);
            if (i < thread.length - 1) await new Promise(r => setTimeout(r, 1000));
          } catch (err) {
            console.error(`  \x1b[31mFailed on tweet ${i + 1}: ${err.message}\x1b[0m`);
            if (i > 0) console.error(`  \x1b[33m${i} tweet(s) were already posted. Thread is partially live.\x1b[0m`);
            break;
          }
        }
        if (lastId) {
          const url = `https://x.com/i/web/status/${lastId}`;
          console.error(`\n\x1b[32mThread live:\x1b[0m ${url}`);
        }
        done = true;
        break;
      }

      case 'r': {
        console.error('\x1b[90mRegenerating...\x1b[0m');
        thread = await generateThreadWithClaude(entry) || generateFallbackThread(entry);
        printThread(thread);
        break;
      }

      case 'e': {
        const num = parseInt(await ask(`Which tweet? (1-${thread.length}) > `), 10);
        if (num < 1 || num > thread.length) { console.error('Invalid number.'); break; }
        console.error(`\x1b[90mCurrent:\x1b[0m ${thread[num - 1]}`);
        const newText = (await ask('New text (empty to cancel): ')).trim();
        if (newText) {
          thread[num - 1] = newText;
          printThread(thread);
        }
        break;
      }

      case 'd': {
        if (thread.length <= 1) { console.error('Cannot delete the only tweet.'); break; }
        const dnum = parseInt(await ask(`Delete which tweet? (1-${thread.length}) > `), 10);
        if (dnum < 1 || dnum > thread.length) { console.error('Invalid number.'); break; }
        thread.splice(dnum - 1, 1);
        printThread(thread);
        break;
      }

      case 'a': {
        const newTweet = (await ask('New tweet text: ')).trim();
        if (newTweet) {
          const pos = parseInt(await ask(`Insert at position? (1-${thread.length + 1}, default: end) > `) || String(thread.length + 1), 10);
          thread.splice(Math.min(pos, thread.length + 1) - 1, 0, newTweet);
          printThread(thread);
        }
        break;
      }

      case 'q':
        console.error('Cancelled.');
        done = true;
        break;

      default:
        console.error('\x1b[90mUnknown command. Use p/r/e/d/a/q.\x1b[0m');
    }
  }

  rl.close();
}

main().catch(err => {
  console.error(`\x1b[31mFatal: ${err.message}\x1b[0m`);
  process.exit(1);
});
