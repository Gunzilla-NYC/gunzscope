import { NextRequest } from 'next/server';
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
    const floorResult = await opensea.getCollectionFloorPrice('off-the-grid');

    if (!floorResult.floorPriceGUN) {
      return Response.json({ success: false, error: 'Failed to fetch floor price' });
    }

    const currentFloorGun = floorResult.floorPriceGUN;
    const subscribers = await getUsersWithAlert('floor_drop');
    let sent = 0;

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
        await logAlert(sub.userId, 'floor_drop', subject, { dedupKey, currentFloorGun, count: droppedNfts.length });
        sent++;
      }
    }

    return Response.json({ success: true, floorPrice: currentFloorGun, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:floor-drop] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
