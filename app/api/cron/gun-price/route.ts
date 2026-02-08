import { NextRequest } from 'next/server';
import { verifyCronAuth, cronUnauthorizedResponse } from '@/lib/cron/auth';
import { getUsersWithAlert, logAlert, getCachedValue, setCachedValue, wasAlertSentRecently } from '@/lib/services/alertPreferenceService';
import { CoinGeckoService } from '@/lib/api/coingecko';
import { sendEmail } from '@/lib/email/resend';
import { gunPriceAlertEmail } from '@/lib/email/templates';

const CACHE_KEY = 'gun_usd';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return cronUnauthorizedResponse();

  try {
    const coingecko = new CoinGeckoService();
    const priceData = await coingecko.getGunTokenPrice();
    if (!priceData) {
      return Response.json({ success: false, error: 'Failed to fetch GUN price' });
    }

    const currentPrice = priceData.gunTokenPrice;
    const previousCached = await getCachedValue(CACHE_KEY);
    await setCachedValue(CACHE_KEY, currentPrice);

    const subscribers = await getUsersWithAlert('gun_price');
    let sent = 0;

    for (const sub of subscribers) {
      const { threshold, direction } = sub.config as { threshold?: number; direction?: string };
      if (!threshold || !direction) continue;

      // Check if threshold was crossed (not just currently above/below)
      const previousPrice = previousCached?.value ?? currentPrice;
      const crossedAbove = direction === 'above' && previousPrice < threshold && currentPrice >= threshold;
      const crossedBelow = direction === 'below' && previousPrice > threshold && currentPrice <= threshold;

      if (!crossedAbove && !crossedBelow) continue;

      // Dedup: don't re-alert within 1 hour
      const dedupKey = `gun_price_${direction}_${threshold}`;
      if (await wasAlertSentRecently(sub.userId, 'gun_price', dedupKey, 60 * 60 * 1000)) continue;

      const { subject, html } = gunPriceAlertEmail(currentPrice, threshold, direction as 'above' | 'below');
      const emailSent = await sendEmail({ to: sub.email, subject, html });

      if (emailSent) {
        await logAlert(sub.userId, 'gun_price', subject, { dedupKey, currentPrice, threshold, direction });
        sent++;
      }
    }

    return Response.json({ success: true, price: currentPrice, alertsSent: sent });
  } catch (error) {
    console.error('[Cron:gun-price] Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
