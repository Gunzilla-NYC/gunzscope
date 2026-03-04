import { NextRequest, after } from 'next/server';
import { verifyCronAuth, cronUnauthorizedResponse } from '@/lib/cron/auth';
import { getUsersWithAlert, logAlert, wasAlertSentRecently } from '@/lib/services/alertPreferenceService';
import { OpenSeaService } from '@/lib/api/opensea';
import { sendEmail } from '@/lib/email/resend';
import { floorDropAlertEmail } from '@/lib/email/templates';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return cronUnauthorizedResponse();

  try {
    const opensea = new OpenSeaService();

    // Fetch floor price and subscribers in parallel (independent operations)
    const [floorResult, subscribers] = await Promise.all([
      opensea.getCollectionFloorPrice('off-the-grid'),
      getUsersWithAlert('floor_drop'),
    ]);

    if (!floorResult.floorPriceGUN) {
      return Response.json({ success: false, error: 'Failed to fetch floor price' });
    }

    const currentFloorGun = floorResult.floorPriceGUN;
    let sent = 0;
    const pendingLogs: Array<{ userId: string; subject: string; meta: Record<string, unknown> }> = [];

    for (const sub of subscribers) {
      const thresholdPct = (sub.config as { threshold?: number }).threshold ?? 20;

      // Get user's wallets to find their NFTs
      const wallets = await prisma.wallet.findMany({
        where: { userProfile: { id: sub.userId } },
        select: { address: true },
      });

      if (wallets.length === 0) continue;

      // Get most recent portfolio snapshot for each wallet
      const droppedNfts: { name: string; purchasePriceGun: number; currentFloorGun: number; dropPct: number }[] = [];

      for (const wallet of wallets) {
        const snapshot = await prisma.portfolioSnapshot.findFirst({
          where: { address: wallet.address.toLowerCase() },
          orderBy: { timestamp: 'desc' },
        });

        if (!snapshot || snapshot.totalGunSpent <= 0 || snapshot.nftsWithPrice <= 0) continue;

        // Approximate avg purchase price per NFT
        const avgPurchasePrice = snapshot.totalGunSpent / snapshot.nftsWithPrice;
        const dropPct = ((avgPurchasePrice - currentFloorGun) / avgPurchasePrice) * 100;

        if (dropPct >= thresholdPct) {
          droppedNfts.push({
            name: `OTG NFTs (${wallet.address.slice(0, 6)}\u2026)`,
            purchasePriceGun: avgPurchasePrice,
            currentFloorGun,
            dropPct,
          });
        }
      }

      if (droppedNfts.length === 0) continue;

      // Dedup: don't re-alert within 24h
      const dedupKey = `floor_drop_${sub.userId}`;
      if (await wasAlertSentRecently(sub.userId, 'floor_drop', dedupKey)) continue;

      const { subject, html } = floorDropAlertEmail(droppedNfts);
      const emailSent = await sendEmail({ to: sub.email, subject, html });

      if (emailSent) {
        pendingLogs.push({ userId: sub.userId, subject, meta: { dedupKey, currentFloorGun, count: droppedNfts.length } });
        sent++;
      }
    }

    // Flush alert logs after the response (non-blocking)
    if (pendingLogs.length > 0) {
      after(() =>
        Promise.all(pendingLogs.map(l => logAlert(l.userId, 'floor_drop', l.subject, l.meta)))
          .catch(e => console.error('[Cron:floor-drop] logAlert error:', e))
      );
    }

    return Response.json({ success: true, floorPrice: currentFloorGun, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:floor-drop] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
