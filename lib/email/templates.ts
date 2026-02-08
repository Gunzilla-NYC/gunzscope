// =============================================================================
// Email Templates — GUNZscope Alert Emails
// All templates use inline styles for email client compatibility.
// =============================================================================

const COLORS = {
  black: '#0A0A0A',
  surface: '#161616',
  card: '#1C1C1C',
  lime: '#A6F700',
  purple: '#6D5BFF',
  profit: '#00FF88',
  loss: '#FF4444',
  white: '#FFFFFF',
  gray3: '#666666',
  gray4: '#999999',
};

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${COLORS.black};font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.black};">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="padding:0 0 24px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:'Courier New',monospace;font-size:18px;font-weight:bold;color:${COLORS.white};letter-spacing:2px;">
              GUNZ<span style="color:${COLORS.purple};">scope</span>
            </td>
            <td style="padding-left:8px;font-family:'Courier New',monospace;font-size:9px;color:${COLORS.gray3};letter-spacing:1px;border:1px solid ${COLORS.gray3};padding:2px 6px;">
              ALERT
            </td>
          </tr></table>
        </td></tr>
        <!-- Accent line -->
        <tr><td style="height:2px;background:linear-gradient(90deg,${COLORS.lime},${COLORS.purple});"></td></tr>
        <!-- Content -->
        <tr><td style="background:${COLORS.surface};padding:32px 24px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="font-family:'Courier New',monospace;font-size:10px;color:${COLORS.gray3};margin:0 0 8px;">
            You received this because you enabled alerts on GUNZscope.
          </p>
          <a href="https://gunzscope.xyz/account" style="font-family:'Courier New',monospace;font-size:10px;color:${COLORS.lime};text-decoration:none;">
            Manage notification preferences
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function valueBlock(label: string, value: string, color: string = COLORS.white): string {
  return `<div style="margin-bottom:16px;">
    <div style="font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.gray3};margin-bottom:4px;">${label}</div>
    <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:bold;color:${color};">${value}</div>
  </div>`;
}

// =============================================================================
// GUN Price Alert
// =============================================================================

export function gunPriceAlertEmail(
  currentPrice: number,
  threshold: number,
  direction: 'above' | 'below'
): { subject: string; html: string } {
  const crossed = direction === 'above' ? 'risen above' : 'fallen below';
  const color = direction === 'above' ? COLORS.profit : COLORS.loss;

  return {
    subject: `GUN Price Alert: $${currentPrice.toFixed(4)} (${direction} $${threshold.toFixed(4)})`,
    html: layout(`
      <h2 style="font-family:'Courier New',monospace;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.white};margin:0 0 20px;">
        GUN Price Alert
      </h2>
      ${valueBlock('Current Price', `$${currentPrice.toFixed(4)}`, color)}
      <p style="font-family:'Courier New',monospace;font-size:12px;color:${COLORS.gray4};line-height:1.6;margin:0 0 20px;">
        GUN has ${crossed} your threshold of <strong style="color:${COLORS.white};">$${threshold.toFixed(4)}</strong>.
      </p>
      <a href="https://gunzscope.xyz/portfolio" style="display:inline-block;padding:10px 20px;background:${COLORS.lime};color:${COLORS.black};font-family:'Courier New',monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        View Portfolio
      </a>
    `),
  };
}

// =============================================================================
// Weekly Portfolio Digest
// =============================================================================

interface DigestSummary {
  totalUsd: number;
  changeUsd: number;
  changePct: number;
  gunPrice: number;
  gunPriceChange: number;
  nftCount: number;
  topGainers: { name: string; changePct: number }[];
  topLosers: { name: string; changePct: number }[];
}

export function portfolioDigestEmail(summary: DigestSummary): { subject: string; html: string } {
  const isUp = summary.changeUsd >= 0;
  const changeColor = isUp ? COLORS.profit : COLORS.loss;
  const arrow = isUp ? '\u25B2' : '\u25BC';

  const gainersHtml = summary.topGainers.length > 0
    ? summary.topGainers.map(g =>
        `<div style="font-family:'Courier New',monospace;font-size:11px;color:${COLORS.profit};margin-bottom:4px;">${arrow} ${g.name}: +${g.changePct.toFixed(1)}%</div>`
      ).join('')
    : `<div style="font-family:'Courier New',monospace;font-size:11px;color:${COLORS.gray3};">No significant gainers</div>`;

  const losersHtml = summary.topLosers.length > 0
    ? summary.topLosers.map(l =>
        `<div style="font-family:'Courier New',monospace;font-size:11px;color:${COLORS.loss};margin-bottom:4px;">\u25BC ${l.name}: ${l.changePct.toFixed(1)}%</div>`
      ).join('')
    : `<div style="font-family:'Courier New',monospace;font-size:11px;color:${COLORS.gray3};">No significant losers</div>`;

  return {
    subject: `Weekly Digest: Portfolio ${isUp ? 'up' : 'down'} ${Math.abs(summary.changePct).toFixed(1)}%`,
    html: layout(`
      <h2 style="font-family:'Courier New',monospace;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.white};margin:0 0 20px;">
        Weekly Portfolio Digest
      </h2>
      ${valueBlock('Portfolio Value', `$${summary.totalUsd.toFixed(2)}`)}
      <div style="display:flex;gap:24px;margin-bottom:20px;">
        ${valueBlock('Week Change', `${isUp ? '+' : ''}$${summary.changeUsd.toFixed(2)} (${isUp ? '+' : ''}${summary.changePct.toFixed(1)}%)`, changeColor)}
        ${valueBlock('GUN Price', `$${summary.gunPrice.toFixed(4)}`)}
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.gray3};margin-bottom:8px;">Top Gainers</div>
        ${gainersHtml}
      </div>
      <div style="margin-bottom:20px;">
        <div style="font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.gray3};margin-bottom:8px;">Top Losers</div>
        ${losersHtml}
      </div>
      <a href="https://gunzscope.xyz/portfolio" style="display:inline-block;padding:10px 20px;background:${COLORS.lime};color:${COLORS.black};font-family:'Courier New',monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        View Full Portfolio
      </a>
    `),
  };
}

// =============================================================================
// Floor Price Drop Alert
// =============================================================================

interface FloorDropNFT {
  name: string;
  purchasePriceGun: number;
  currentFloorGun: number;
  dropPct: number;
}

export function floorDropAlertEmail(nfts: FloorDropNFT[]): { subject: string; html: string } {
  const nftRows = nfts.map(nft => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.white};">${nft.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.gray4};text-align:right;">${nft.purchasePriceGun.toFixed(1)} GUN</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.loss};text-align:right;">${nft.currentFloorGun.toFixed(1)} GUN</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.loss};text-align:right;">${nft.dropPct.toFixed(0)}%</td>
    </tr>
  `).join('');

  return {
    subject: `Floor Drop Alert: ${nfts.length} NFT${nfts.length > 1 ? 's' : ''} below purchase price`,
    html: layout(`
      <h2 style="font-family:'Courier New',monospace;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.white};margin:0 0 8px;">
        Floor Price Drop
      </h2>
      <p style="font-family:'Courier New',monospace;font-size:12px;color:${COLORS.gray4};margin:0 0 20px;">
        ${nfts.length} NFT${nfts.length > 1 ? 's have' : ' has'} floor prices significantly below your purchase price.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;">Item</td>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;text-align:right;">Paid</td>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;text-align:right;">Floor</td>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;text-align:right;">Drop</td>
        </tr>
        ${nftRows}
      </table>
      <a href="https://gunzscope.xyz/portfolio" style="display:inline-block;padding:10px 20px;background:${COLORS.lime};color:${COLORS.black};font-family:'Courier New',monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        View Portfolio
      </a>
    `),
  };
}

// =============================================================================
// Whale Tracker Alert
// =============================================================================

interface WhaleActivity {
  walletAddress: string;
  walletLabel?: string;
  action: string; // "transferred", "purchased", "listed"
  nftName: string;
  priceGun?: number;
  timestamp: string;
}

export function whaleTrackerEmail(activities: WhaleActivity[]): { subject: string; html: string } {
  const wallet = activities[0]?.walletLabel || truncateAddr(activities[0]?.walletAddress || '');

  const rows = activities.map(a => `
    <div style="padding:10px 0;border-bottom:1px solid #222;">
      <div style="font-family:'Courier New',monospace;font-size:11px;color:${COLORS.white};margin-bottom:4px;">
        ${a.action}: <strong>${a.nftName}</strong>
      </div>
      <div style="font-family:'Courier New',monospace;font-size:10px;color:${COLORS.gray3};">
        ${a.priceGun ? `${a.priceGun.toFixed(1)} GUN \u00B7 ` : ''}${a.timestamp}
      </div>
    </div>
  `).join('');

  return {
    subject: `Whale Alert: ${wallet} — ${activities.length} new action${activities.length > 1 ? 's' : ''}`,
    html: layout(`
      <h2 style="font-family:'Courier New',monospace;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.white};margin:0 0 8px;">
        Whale Tracker
      </h2>
      <p style="font-family:'Courier New',monospace;font-size:12px;color:${COLORS.gray4};margin:0 0 20px;">
        New activity detected on watched wallet: <strong style="color:${COLORS.lime};">${wallet}</strong>
      </p>
      <div style="margin-bottom:20px;">${rows}</div>
      <a href="https://gunzscope.xyz/account" style="display:inline-block;padding:10px 20px;background:${COLORS.lime};color:${COLORS.black};font-family:'Courier New',monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        View Account
      </a>
    `),
  };
}

// =============================================================================
// New Collection Drop
// =============================================================================

interface CollectionInfo {
  name: string;
  slug: string;
  floorPriceGun?: number;
  totalSupply?: number;
}

export function collectionDropEmail(collection: CollectionInfo): { subject: string; html: string } {
  return {
    subject: `New OTG Collection: ${collection.name}`,
    html: layout(`
      <h2 style="font-family:'Courier New',monospace;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.white};margin:0 0 8px;">
        New Collection Drop
      </h2>
      <p style="font-family:'Courier New',monospace;font-size:12px;color:${COLORS.gray4};margin:0 0 20px;">
        A new OTG collection has appeared on OpenSea.
      </p>
      ${valueBlock('Collection', collection.name, COLORS.lime)}
      ${collection.floorPriceGun ? valueBlock('Floor Price', `${collection.floorPriceGun.toFixed(1)} GUN`) : ''}
      ${collection.totalSupply ? valueBlock('Total Supply', collection.totalSupply.toLocaleString()) : ''}
      <a href="https://gunzscope.xyz/portfolio" style="display:inline-block;padding:10px 20px;background:${COLORS.lime};color:${COLORS.black};font-family:'Courier New',monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        Explore Collection
      </a>
    `),
  };
}

// =============================================================================
// Snipe Alert
// =============================================================================

interface SnipeListing {
  nftName: string;
  listPriceGun: number;
  floorPriceGun: number;
  belowFloorPct: number;
  openseaUrl?: string;
}

export function snipeAlertEmail(listings: SnipeListing[]): { subject: string; html: string } {
  const rows = listings.map(l => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.white};">${l.nftName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.profit};text-align:right;">${l.listPriceGun.toFixed(1)} GUN</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.gray4};text-align:right;">${l.floorPriceGun.toFixed(1)} GUN</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;font-family:'Courier New',monospace;font-size:11px;color:${COLORS.profit};text-align:right;">${l.belowFloorPct.toFixed(0)}% below</td>
    </tr>
  `).join('');

  return {
    subject: `Snipe Alert: ${listings.length} NFT${listings.length > 1 ? 's' : ''} listed below floor`,
    html: layout(`
      <h2 style="font-family:'Courier New',monospace;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.white};margin:0 0 8px;">
        Snipe Alert
      </h2>
      <p style="font-family:'Courier New',monospace;font-size:12px;color:${COLORS.gray4};margin:0 0 20px;">
        ${listings.length} NFT${listings.length > 1 ? 's are' : ' is'} currently listed below floor price.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;">Item</td>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;text-align:right;">Listed</td>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;text-align:right;">Floor</td>
          <td style="padding:4px 0;font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.gray3};border-bottom:1px solid #333;text-align:right;">Discount</td>
        </tr>
        ${rows}
      </table>
      <a href="https://gunzscope.xyz/portfolio" style="display:inline-block;padding:10px 20px;background:${COLORS.lime};color:${COLORS.black};font-family:'Courier New',monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        View Portfolio
      </a>
    `),
  };
}

// =============================================================================
// Helpers
// =============================================================================

function truncateAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}
