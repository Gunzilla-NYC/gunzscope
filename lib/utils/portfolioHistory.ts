/**
 * Portfolio History Storage
 *
 * Lightweight client-side storage for portfolio value history.
 * Used to compute 24h/7d changes and render sparklines.
 */

const STORAGE_KEY = 'gunzscope:portfolio:history';
const MAX_POINTS = 168; // 7 days at 1 point per hour
const MIN_INTERVAL_MS = 5 * 60 * 1000; // Minimum 5 minutes between points

export interface PortfolioSnapshot {
  t: number; // Unix timestamp (ms)
  v: number; // Portfolio value (USD)
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
export function addPortfolioSnapshot(address: string, value: number): void {
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
    existing.points.push({ t: now, v: value });
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
 * Get sparkline values (last N points normalized for display)
 */
export function getSparklineValues(address: string, count: number = 24): number[] {
  const points = getPortfolioHistory(address);

  if (points.length === 0) return [];

  // Get the last `count` points
  const recentPoints = points.slice(-count);
  return recentPoints.map(p => p.v);
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
