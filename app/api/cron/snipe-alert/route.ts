import { NextRequest, after } from 'next/server';
import { verifyCronAuth, cronUnauthorizedResponse } from '@/lib/cron/auth';
import { getUsersWithAlert, logAlert, wasAlertSentRecently } from '@/lib/services/alertPreferenceService';
import { OpenSeaService } from '@/lib/api/opensea';
import { sendEmail } from '@/lib/email/resend';
import { snipeAlertEmail } from '@/lib/email/templates';

const NFT_CONTRACT = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return cronUnauthorizedResponse();

  try {
    const opensea = new OpenSeaService();

    // Get current floor price
    const floorResult = await opensea.getCollectionFloorPrice('off-the-grid');
    if (!floorResult.floorPriceGUN) {
      return Response.json({ success: false, error: 'Failed to fetch floor price' });
    }

    const floorPriceGun = floorResult.floorPriceGUN;

    // Get active listings
    const listings = await opensea.getListings(NFT_CONTRACT, 'avalanche');

    const subscribers = await getUsersWithAlert('snipe_alert');
    let sent = 0;
    const pendingLogs: Array<{ userId: string; subject: string; meta: Record<string, unknown> }> = [];

    for (const sub of subscribers) {
      const thresholdPct = (sub.config as { threshold?: number }).threshold ?? 10;

      // Find listings below floor
      const snipeListings: { nftName: string; listPriceGun: number; floorPriceGun: number; belowFloorPct: number }[] = [];

      for (const listing of listings) {
        const listPrice = parseFloat(listing.price?.amount || listing.current_price || '0');
        // OpenSea prices are in wei for ERC20 tokens — convert if needed
        const listPriceGun = listPrice > 1e10 ? listPrice / 1e18 : listPrice;

        if (listPriceGun <= 0 || listPriceGun >= floorPriceGun) continue;

        const belowFloorPct = ((floorPriceGun - listPriceGun) / floorPriceGun) * 100;

        if (belowFloorPct >= thresholdPct) {
          const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria || 'Unknown';
          snipeListings.push({
            nftName: `OTG #${tokenId}`,
            listPriceGun,
            floorPriceGun,
            belowFloorPct,
          });
        }
      }

      if (snipeListings.length === 0) continue;

      // Dedup: don't re-alert within 24h
      const dedupKey = `snipe_${sub.userId}`;
      if (await wasAlertSentRecently(sub.userId, 'snipe_alert', dedupKey)) continue;

      const { subject, html } = snipeAlertEmail(snipeListings);
      const emailSent = await sendEmail({ to: sub.email, subject, html });

      if (emailSent) {
        pendingLogs.push({ userId: sub.userId, subject, meta: { dedupKey, count: snipeListings.length } });
        sent++;
      }
    }

    // Flush alert logs after the response (non-blocking)
    if (pendingLogs.length > 0) {
      after(() =>
        Promise.all(pendingLogs.map(l => logAlert(l.userId, 'snipe_alert', l.subject, l.meta)))
          .catch(e => console.error('[Cron:snipe-alert] logAlert error:', e))
      );
    }

    return Response.json({ success: true, floorPrice: floorPriceGun, listingsChecked: listings.length, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:snipe-alert] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
