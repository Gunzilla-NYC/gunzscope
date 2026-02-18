/**
 * Portfolio History Storage
 *
 * Lightweight client-side storage for portfolio value history.
 * Used to compute 24h/7d changes and render sparklines.
 */

const STORAGE_KEY = 'gunzscope:portfolio:history';
const MAX_POINTS = 2160; // ~90 days at 1 point per hour
const MIN_INTERVAL_MS = 5 * 60 * 1000; // Minimum 5 minutes between points

export interface PortfolioSnapshot {
  t: number; // Unix timestamp (ms)
  v: number; // Portfolio value (USD) — market value when available
  n?: number; // NFT count (added later — missing on older points)
  cb?: number; // Cost basis (USD) — added later, missing on older points
}

export interface PortfolioHistoryData {
  address: string;
  points: PortfolioSnapshot[];
  lastUpdated: number;
}

/**
 * Get history for a specific wallet address
 */
export function getPortfolioHistory(address: string): PortfolioSnapshot[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: Record<string, PortfolioHistoryData> = JSON.parse(stored);
    const walletData = data[address.toLowerCase()];
    return walletData?.points || [];
  } catch {
    return [];
  }
}

/**
 * Add a new portfolio value snapshot
 */
export function addPortfolioSnapshot(address: string, value: number, nftCount?: number, costBasis?: number): void {
  if (typeof window === 'undefined') return;
  if (value <= 0) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data: Record<string, PortfolioHistoryData> = stored ? JSON.parse(stored) : {};

    const normalizedAddress = address.toLowerCase();
    const existing = data[normalizedAddress] || { address: normalizedAddress, points: [], lastUpdated: 0 };

    const now = Date.now();

    // Skip if too recent
    if (existing.points.length > 0) {
      const lastPoint = existing.points[existing.points.length - 1];
      if (now - lastPoint.t < MIN_INTERVAL_MS) {
        return;
      }
    }

    // Add new point
    const point: PortfolioSnapshot = { t: now, v: value };
    if (nftCount != null && nftCount > 0) point.n = nftCount;
    if (costBasis != null && costBasis > 0) point.cb = costBasis;
    existing.points.push(point);
    existing.lastUpdated = now;

    // Trim to max points
    if (existing.points.length > MAX_POINTS) {
      existing.points = existing.points.slice(-MAX_POINTS);
    }

    data[normalizedAddress] = existing;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save portfolio snapshot:', error);
  }
}

/**
 * Bootstrap portfolio history from a GUN price sparkline on first visit.
 *
 * When a wallet has zero history points, we generate synthetic points from the
 * 7-day hourly GUN price sparkline (168 points from CoinGecko). Each synthetic
 * value = historicalGunPrice × (currentValue / currentGunPrice).
 *
 * This gives us instant 24h/7d change numbers and a real sparkline from stored
 * history on subsequent renders.
 *
 * Returns true if bootstrap was performed.
 */
export function bootstrapPortfolioHistory(
  address: string,
  currentValue: number,
  gunPriceSparkline: number[],
  currentGunPrice: number,
  costBasis?: number,
): boolean {
  if (typeof window === 'undefined') return false;
  if (currentValue <= 0 || currentGunPrice <= 0) return false;
  if (gunPriceSparkline.length < 2) return false;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data: Record<string, PortfolioHistoryData> = stored ? JSON.parse(stored) : {};
    const normalizedAddress = address.toLowerCase();
    const existing = data[normalizedAddress];

    // Only bootstrap if no history exists
    if (existing && existing.points.length > 0) return false;

    const holdingsMultiplier = currentValue / currentGunPrice;
    const cbMultiplier = costBasis != null && costBasis > 0 ? costBasis / currentGunPrice : 0;
    const now = Date.now();
    const sparkLen = gunPriceSparkline.length;
    // CoinGecko 7d sparkline has ~168 hourly points
    const msPerPoint = (7 * 24 * 60 * 60 * 1000) / (sparkLen - 1);

    const points: PortfolioSnapshot[] = [];
    // Sample evenly — take ~24 points (one every ~7 hours) to avoid bloating storage
    const sampleCount = Math.min(24, sparkLen);
    for (let i = 0; i < sampleCount; i++) {
      const srcIdx = Math.round((i / (sampleCount - 1)) * (sparkLen - 1));
      const syntheticValue = gunPriceSparkline[srcIdx] * holdingsMultiplier;
      const timestamp = now - (sparkLen - 1 - srcIdx) * msPerPoint;
      if (syntheticValue > 0) {
        const point: PortfolioSnapshot = { t: Math.round(timestamp), v: syntheticValue };
        if (cbMultiplier > 0) point.cb = gunPriceSparkline[srcIdx] * cbMultiplier;
        points.push(point);
      }
    }

    if (points.length < 2) return false;

    data[normalizedAddress] = {
      address: normalizedAddress,
      points,
      lastUpdated: now,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get value closest to a target timestamp
 */
function getValueAtTime(points: PortfolioSnapshot[], targetTime: number): number | null {
  if (points.length === 0) return null;

  // Find the point closest to target time that's before or at the target
  let closest: PortfolioSnapshot | null = null;
  let closestDiff = Infinity;

  for (const point of points) {
    if (point.t <= targetTime) {
      const diff = targetTime - point.t;
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = point;
      }
    }
  }

  // Allow up to 2 hours tolerance for finding a match
  const tolerance = 2 * 60 * 60 * 1000;
  if (closest && closestDiff <= tolerance) {
    return closest.v;
  }

  return null;
}

/**
 * Calculate portfolio changes
 */
export interface PortfolioChanges {
  change24h: number | null;
  changePercent24h: number | null;
  change7d: number | null;
  changePercent7d: number | null;
  hasEnoughData: boolean;
}

export function calculatePortfolioChanges(
  address: string,
  currentValue: number
): PortfolioChanges {
  const points = getPortfolioHistory(address);

  const now = Date.now();
  const time24hAgo = now - 24 * 60 * 60 * 1000;
  const time7dAgo = now - 7 * 24 * 60 * 60 * 1000;

  const value24hAgo = getValueAtTime(points, time24hAgo);
  const value7dAgo = getValueAtTime(points, time7dAgo);

  let change24h: number | null = null;
  let changePercent24h: number | null = null;
  let change7d: number | null = null;
  let changePercent7d: number | null = null;

  if (value24hAgo !== null && value24hAgo > 0) {
    change24h = currentValue - value24hAgo;
    changePercent24h = (change24h / value24hAgo) * 100;
  }

  if (value7dAgo !== null && value7dAgo > 0) {
    change7d = currentValue - value7dAgo;
    changePercent7d = (change7d / value7dAgo) * 100;
  }

  // Need at least 24h of data for meaningful changes
  const hasEnoughData = points.length >= 2 && value24hAgo !== null;

  return {
    change24h,
    changePercent24h,
    change7d,
    changePercent7d,
    hasEnoughData,
  };
}

/**
 * Get sparkline values — evenly sampled across the full history.
 * If fewer points exist than requested, all points are returned.
 */
export function getSparklineValues(address: string, count: number = 90): number[] {
  const points = getPortfolioHistory(address);

  if (points.length === 0) return [];
  if (points.length <= count) return points.map(p => p.v);

  // Evenly sample `count` points spanning the entire history
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const srcIdx = Math.round((i / (count - 1)) * (points.length - 1));
    result.push(points[srcIdx].v);
  }
  return result;
}

/**
 * Get sparkline NFT counts — same sampling as getSparklineValues.
 * Returns null for points that predate the nftCount field.
 */
export function getSparklineNftCounts(address: string, count: number = 90): (number | null)[] {
  const points = getPortfolioHistory(address);

  if (points.length === 0) return [];
  if (points.length <= count) return points.map(p => p.n ?? null);

  const result: (number | null)[] = [];
  for (let i = 0; i < count; i++) {
    const srcIdx = Math.round((i / (count - 1)) * (points.length - 1));
    result.push(points[srcIdx].n ?? null);
  }
  return result;
}

/**
 * Get sparkline cost basis values — same sampling as getSparklineValues.
 * Returns null for points that predate the cost basis field.
 */
export function getSparklineCostBasis(address: string, count: number = 90): (number | null)[] {
  const points = getPortfolioHistory(address);

  if (points.length === 0) return [];
  if (points.length <= count) return points.map(p => p.cb ?? null);

  const result: (number | null)[] = [];
  for (let i = 0; i < count; i++) {
    const srcIdx = Math.round((i / (count - 1)) * (points.length - 1));
    result.push(points[srcIdx].cb ?? null);
  }
  return result;
}

/**
 * Get the time span of stored history in days.
 */
export function getSparklineSpanDays(address: string): number {
  const points = getPortfolioHistory(address);
  if (points.length < 2) return 0;
  return (points[points.length - 1].t - points[0].t) / (24 * 60 * 60 * 1000);
}

/**
 * Clear history for an address
 */
export function clearPortfolioHistory(address: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const data: Record<string, PortfolioHistoryData> = JSON.parse(stored);
    delete data[address.toLowerCase()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all portfolio history
 */
export function clearAllPortfolioHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
