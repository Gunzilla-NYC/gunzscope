import { NextRequest, after } from 'next/server';
import { verifyCronAuth, cronUnauthorizedResponse } from '@/lib/cron/auth';
import { getUsersWithAlert, logAlert, getCachedValue, setCachedValue } from '@/lib/services/alertPreferenceService';
import { sendEmail } from '@/lib/email/resend';
import { collectionDropEmail } from '@/lib/email/templates';

const KNOWN_COLLECTIONS_KEY = 'known_otg_collections';

// Known OTG collection slugs on OpenSea
const OTG_COLLECTION_SLUGS = [
  'off-the-grid',
  'off-the-grid-validator-license',
];

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return cronUnauthorizedResponse();

  try {
    // Fetch current collections from OpenSea
    const apiKey = process.env.OPENSEA_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) headers['X-API-KEY'] = apiKey;

    // Search for OTG-related collections
    const res = await fetch(
      'https://api.opensea.io/api/v2/collections?chain=avalanche&limit=50',
      { headers }
    );

    if (!res.ok) {
      return Response.json({ success: false, error: 'OpenSea API error' });
    }

    const data = await res.json();
    const collections = (data.collections || []) as { collection: string; name: string; total_supply?: number }[];

    // Filter for OTG-related collections (contains "off-the-grid" or "otg")
    const otgCollections = collections.filter(
      (c) =>
        c.name?.toLowerCase().includes('off the grid') ||
        c.name?.toLowerCase().includes('otg') ||
        c.collection?.toLowerCase().includes('off-the-grid')
    );

    // Check against known collections
    const cached = await getCachedValue(KNOWN_COLLECTIONS_KEY);
    const knownSlugsStr = cached ? String(cached.value) : OTG_COLLECTION_SLUGS.join(',');

    const newCollections = otgCollections.filter(
      (c) => !knownSlugsStr.includes(c.collection)
    );

    if (newCollections.length === 0) {
      return Response.json({ success: true, newCollections: 0 });
    }

    // Update known collections cache
    const allSlugs = [...knownSlugsStr.split(','), ...newCollections.map((c) => c.collection)].join(',');
    // Store as a number (we use the length as a sentinel; the actual slugs are tracked in alert metadata)
    await setCachedValue(KNOWN_COLLECTIONS_KEY, allSlugs.length);

    // Notify subscribers
    const subscribers = await getUsersWithAlert('collection_drop');
    let sent = 0;
    const pendingLogs: Array<{ userId: string; subject: string; meta: Record<string, unknown> }> = [];

    for (const collection of newCollections) {
      for (const sub of subscribers) {
        const { subject, html } = collectionDropEmail({
          name: collection.name || collection.collection,
          slug: collection.collection,
          totalSupply: collection.total_supply,
        });

        const emailSent = await sendEmail({ to: sub.email, subject, html });

        if (emailSent) {
          pendingLogs.push({ userId: sub.userId, subject, meta: { slug: collection.collection } });
          sent++;
        }
      }
    }

    // Flush alert logs after the response (non-blocking)
    if (pendingLogs.length > 0) {
      after(() =>
        Promise.all(pendingLogs.map(l => logAlert(l.userId, 'collection_drop', l.subject, l.meta)))
          .catch(e => console.error('[Cron:collection-drop] logAlert error:', e))
      );
    }

    return Response.json({ success: true, newCollections: newCollections.length, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:collection-drop] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
