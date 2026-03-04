import { NextRequest } from 'next/server';
import { verifyCronAuth, cronUnauthorizedResponse } from '@/lib/cron/auth';
import { getUsersWithAlert, logAlert, getCachedValue, setCachedValue, wasAlertSentRecently } from '@/lib/services/alertPreferenceService';
import { sendEmail } from '@/lib/email/resend';
import { whaleTrackerEmail } from '@/lib/email/templates';
import prisma from '@/lib/db';
import { ethers } from 'ethers';

const RPC_URL = process.env.AVALANCHE_RPC_URL || 'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';
const NFT_CONTRACT = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return cronUnauthorizedResponse();

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    // Fetch block number and subscribers in parallel (independent operations)
    const [currentBlock, subscribers] = await Promise.all([
      provider.getBlockNumber(),
      getUsersWithAlert('whale_tracker'),
    ]);
    let sent = 0;

    for (const sub of subscribers) {
      // Get user's tracked addresses
      const trackedAddresses = await prisma.trackedAddress.findMany({
        where: { userProfileId: sub.userId },
        select: { address: true, label: true },
      });

      if (trackedAddresses.length === 0) continue;

      const activities: { walletAddress: string; walletLabel?: string; action: string; nftName: string; priceGun?: number; timestamp: string }[] = [];

      for (const tracked of trackedAddresses) {
        const cacheKey = `whale_block_${tracked.address.toLowerCase()}`;
        const lastCheck = await getCachedValue(cacheKey);
        const fromBlock = lastCheck ? Math.floor(lastCheck.value) + 1 : currentBlock - 300; // ~5 min of blocks

        if (fromBlock > currentBlock) continue;

        try {
          // Check for transfers involving this address
          const addressPadded = ethers.zeroPadValue(tracked.address.toLowerCase(), 32);

          // Fetch sent and received transfer logs in parallel
          const [sentLogs, receivedLogs] = await Promise.all([
            provider.getLogs({
              address: NFT_CONTRACT,
              topics: [TRANSFER_TOPIC, addressPadded],
              fromBlock,
              toBlock: currentBlock,
            }),
            provider.getLogs({
              address: NFT_CONTRACT,
              topics: [TRANSFER_TOPIC, null, addressPadded],
              fromBlock,
              toBlock: currentBlock,
            }),
          ]);

          for (const log of sentLogs) {
            const tokenId = BigInt(log.topics[3]).toString();
            activities.push({
              walletAddress: tracked.address,
              walletLabel: tracked.label ?? undefined,
              action: 'Sent NFT',
              nftName: `OTG #${tokenId}`,
              timestamp: new Date().toISOString(),
            });
          }

          for (const log of receivedLogs) {
            const tokenId = BigInt(log.topics[3]).toString();
            activities.push({
              walletAddress: tracked.address,
              walletLabel: tracked.label ?? undefined,
              action: 'Received NFT',
              nftName: `OTG #${tokenId}`,
              timestamp: new Date().toISOString(),
            });
          }

          await setCachedValue(cacheKey, currentBlock);
        } catch {
          // Skip this address on RPC errors
        }
      }

      if (activities.length === 0) continue;

      // Dedup: don't re-alert within 10 min
      const dedupKey = `whale_${sub.userId}_${currentBlock}`;
      if (await wasAlertSentRecently(sub.userId, 'whale_tracker', dedupKey, 10 * 60 * 1000)) continue;

      const { subject, html } = whaleTrackerEmail(activities);
      const emailSent = await sendEmail({ to: sub.email, subject, html });

      if (emailSent) {
        await logAlert(sub.userId, 'whale_tracker', subject, { dedupKey, activityCount: activities.length });
        sent++;
      }
    }

    return Response.json({ success: true, block: currentBlock, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:whale-tracker] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
