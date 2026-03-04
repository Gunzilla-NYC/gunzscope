import { NextRequest } from 'next/server';
import { verifyCronAuth, cronUnauthorizedResponse } from '@/lib/cron/auth';
import { getUsersWithAlert, logAlert } from '@/lib/services/alertPreferenceService';
import { CoinGeckoService } from '@/lib/api/coingecko';
import { sendEmail } from '@/lib/email/resend';
import { portfolioDigestEmail } from '@/lib/email/templates';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return cronUnauthorizedResponse();

  try {
    const coingecko = new CoinGeckoService();

    // Fetch price and subscribers in parallel (independent operations)
    const [priceData, subscribers] = await Promise.all([
      coingecko.getGunTokenPrice(),
      getUsersWithAlert('portfolio_digest'),
    ]);
    const currentGunPrice = priceData?.gunTokenPrice ?? 0;
    let sent = 0;

    for (const sub of subscribers) {
      // Get user's wallets
      const wallets = await prisma.wallet.findMany({
        where: { userProfile: { id: sub.userId } },
        select: { address: true },
      });

      if (wallets.length === 0) continue;

      // Get latest and week-old snapshots
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      let totalNftValueGun = 0;
      let totalGunBalance = 0;
      let prevTotalNftValueGun = 0;
      let prevTotalGunBalance = 0;
      let totalNftCount = 0;

      // Fetch latest + prev snapshots for all wallets in parallel
      const snapshotResults = await Promise.all(
        wallets.map(async (wallet) => {
          const addr = wallet.address.toLowerCase();
          const [latest, prev] = await Promise.all([
            prisma.portfolioSnapshot.findFirst({
              where: { address: addr },
              orderBy: { timestamp: 'desc' },
            }),
            prisma.portfolioSnapshot.findFirst({
              where: { address: addr, timestamp: { lte: oneWeekAgo } },
              orderBy: { timestamp: 'desc' },
            }),
          ]);
          return { latest, prev };
        })
      );

      for (const { latest, prev } of snapshotResults) {
        if (latest) {
          totalNftValueGun += latest.nftValueGun;
          totalGunBalance += latest.gunBalance;
          totalNftCount += latest.nftCount;
        }
        if (prev) {
          prevTotalNftValueGun += prev.nftValueGun;
          prevTotalGunBalance += prev.gunBalance;
        }
      }

      const currentTotalUsd = (totalNftValueGun + totalGunBalance) * currentGunPrice;
      const prevTotalUsd = (prevTotalNftValueGun + prevTotalGunBalance) * currentGunPrice;
      const changeUsd = currentTotalUsd - prevTotalUsd;
      const changePct = prevTotalUsd > 0 ? (changeUsd / prevTotalUsd) * 100 : 0;

      const { subject, html } = portfolioDigestEmail({
        totalUsd: currentTotalUsd,
        changeUsd,
        changePct,
        gunPrice: currentGunPrice,
        gunPriceChange: 0,
        nftCount: totalNftCount,
        topGainers: [],
        topLosers: [],
      });

      const emailSent = await sendEmail({ to: sub.email, subject, html });

      if (emailSent) {
        await logAlert(sub.userId, 'portfolio_digest', subject, { totalUsd: currentTotalUsd, changeUsd });
        sent++;
      }
    }

    return Response.json({ success: true, gunPrice: currentGunPrice, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:portfolio-digest] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
