import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  addPortfolioSnapshot,
  getPortfolioHistory,
  calculatePortfolioChanges,
  getSparklineValues,
  clearPortfolioHistory,
  clearAllPortfolioHistory,
} from '../portfolioHistory';

describe('portfolioHistory', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';
  const testAddressUpper = '0x1234567890123456789012345678901234567890'.toUpperCase();

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset timers
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addPortfolioSnapshot', () => {
    it('should add first snapshot', () => {
      addPortfolioSnapshot(testAddress, 1000);
      const history = getPortfolioHistory(testAddress);
      expect(history).toHaveLength(1);
      expect(history[0].v).toBe(1000);
    });

    it('should normalize address to lowercase', () => {
      addPortfolioSnapshot(testAddressUpper, 1000);
      // Should be retrievable with lowercase
      const history = getPortfolioHistory(testAddress.toLowerCase());
      expect(history).toHaveLength(1);
    });

    it('should throttle snapshots within 5 minutes', () => {
      addPortfolioSnapshot(testAddress, 1000);
      vi.advanceTimersByTime(2 * 60 * 1000); // 2 minutes
      addPortfolioSnapshot(testAddress, 1100);

      const history = getPortfolioHistory(testAddress);
      expect(history).toHaveLength(1); // Still 1, throttled
      expect(history[0].v).toBe(1000); // Original value
    });

    it('should allow snapshot after 5 minutes', () => {
      addPortfolioSnapshot(testAddress, 1000);
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      addPortfolioSnapshot(testAddress, 1100);

      const history = getPortfolioHistory(testAddress);
      expect(history).toHaveLength(2);
      expect(history[0].v).toBe(1000);
      expect(history[1].v).toBe(1100);
    });

    it('should ignore zero values', () => {
      addPortfolioSnapshot(testAddress, 0);
      const history = getPortfolioHistory(testAddress);
      expect(history).toHaveLength(0);
    });

    it('should ignore negative values', () => {
      addPortfolioSnapshot(testAddress, -100);
      const history = getPortfolioHistory(testAddress);
      expect(history).toHaveLength(0);
    });

    it('should trim to max 168 points', () => {
      // Add 200 snapshots (advancing time each time to bypass throttle)
      for (let i = 0; i < 200; i++) {
        vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
        addPortfolioSnapshot(testAddress, 1000 + i);
      }

      const history = getPortfolioHistory(testAddress);
      expect(history.length).toBeLessThanOrEqual(168);
      // Should have the most recent values
      expect(history[history.length - 1].v).toBe(1000 + 199);
    });

    it('should store timestamps correctly', () => {
      const baseTime = new Date('2026-02-01T12:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      addPortfolioSnapshot(testAddress, 1000);
      const history = getPortfolioHistory(testAddress);

      expect(history[0].t).toBe(baseTime);
    });
  });

  describe('getPortfolioHistory', () => {
    it('should return empty array for unknown address', () => {
      const history = getPortfolioHistory('0xunknown');
      expect(history).toEqual([]);
    });

    it('should return empty array when localStorage is empty', () => {
      const history = getPortfolioHistory(testAddress);
      expect(history).toEqual([]);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('gunzscope:portfolio:history', 'not-valid-json');
      const history = getPortfolioHistory(testAddress);
      expect(history).toEqual([]);
    });
  });

  describe('calculatePortfolioChanges', () => {
    it('should return null values with no history', () => {
      const changes = calculatePortfolioChanges(testAddress, 1000);
      expect(changes.change24h).toBeNull();
      expect(changes.changePercent24h).toBeNull();
      expect(changes.change7d).toBeNull();
      expect(changes.changePercent7d).toBeNull();
      expect(changes.hasEnoughData).toBe(false);
    });

    it('should return null values with only one data point', () => {
      addPortfolioSnapshot(testAddress, 1000);
      const changes = calculatePortfolioChanges(testAddress, 1100);
      expect(changes.hasEnoughData).toBe(false);
    });

    it('should calculate 24h change correctly', () => {
      // Add snapshot from 25 hours ago
      vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));
      addPortfolioSnapshot(testAddress, 900);

      // Move to current time (25 hours later)
      vi.setSystemTime(new Date('2026-02-02T01:00:00Z'));
      addPortfolioSnapshot(testAddress, 1000);

      const changes = calculatePortfolioChanges(testAddress, 1000);
      expect(changes.change24h).toBe(100); // 1000 - 900
      expect(changes.changePercent24h).toBeCloseTo(11.11, 1); // (100/900) * 100
      expect(changes.hasEnoughData).toBe(true);
    });

    it('should calculate 7d change correctly', () => {
      // Add snapshot from 7 days + 1 hour ago (within 2hr tolerance of 7d lookback)
      vi.setSystemTime(new Date('2026-01-25T11:00:00Z'));
      addPortfolioSnapshot(testAddress, 800);

      // Move to current time (exactly 7 days later)
      vi.setSystemTime(new Date('2026-02-01T12:00:00Z'));
      addPortfolioSnapshot(testAddress, 1000);

      const changes = calculatePortfolioChanges(testAddress, 1000);
      expect(changes.change7d).toBe(200); // 1000 - 800
      expect(changes.changePercent7d).toBeCloseTo(25, 1); // (200/800) * 100
    });

    it('should handle negative changes', () => {
      // Value decreased
      vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));
      addPortfolioSnapshot(testAddress, 1000);

      vi.setSystemTime(new Date('2026-02-02T01:00:00Z'));
      addPortfolioSnapshot(testAddress, 800);

      const changes = calculatePortfolioChanges(testAddress, 800);
      expect(changes.change24h).toBe(-200);
      expect(changes.changePercent24h).toBe(-20);
    });

    it('should return null for 24h if no data point within 2hr tolerance', () => {
      // Add snapshot from 30 hours ago (outside 24h + 2hr tolerance)
      vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));
      addPortfolioSnapshot(testAddress, 900);

      // Jump to 30 hours later
      vi.setSystemTime(new Date('2026-02-02T06:00:00Z'));

      const changes = calculatePortfolioChanges(testAddress, 1000);
      // 30 hours ago is outside the 2-hour tolerance window for 24h lookback
      expect(changes.change24h).toBeNull();
    });
  });

  describe('getSparklineValues', () => {
    it('should return empty array for no history', () => {
      const values = getSparklineValues(testAddress, 24);
      expect(values).toEqual([]);
    });

    it('should return all values if less than count', () => {
      addPortfolioSnapshot(testAddress, 100);
      vi.advanceTimersByTime(6 * 60 * 1000);
      addPortfolioSnapshot(testAddress, 200);
      vi.advanceTimersByTime(6 * 60 * 1000);
      addPortfolioSnapshot(testAddress, 300);

      const values = getSparklineValues(testAddress, 24);
      expect(values).toEqual([100, 200, 300]);
    });

    it('should return last N values', () => {
      // Add 10 snapshots
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(6 * 60 * 1000);
        addPortfolioSnapshot(testAddress, 1000 + i * 10);
      }

      const values = getSparklineValues(testAddress, 5);
      expect(values).toHaveLength(5);
      // Should be last 5 values
      expect(values).toEqual([1050, 1060, 1070, 1080, 1090]);
    });

    it('should use default count of 24', () => {
      // Add 30 snapshots
      for (let i = 0; i < 30; i++) {
        vi.advanceTimersByTime(6 * 60 * 1000);
        addPortfolioSnapshot(testAddress, 1000 + i);
      }

      const values = getSparklineValues(testAddress);
      expect(values).toHaveLength(24);
    });
  });

  describe('clearPortfolioHistory', () => {
    it('should remove history for specific address', () => {
      const address2 = '0xabcdef1234567890abcdef1234567890abcdef12';

      addPortfolioSnapshot(testAddress, 1000);
      addPortfolioSnapshot(address2, 2000);

      clearPortfolioHistory(testAddress);

      expect(getPortfolioHistory(testAddress)).toHaveLength(0);
      expect(getPortfolioHistory(address2)).toHaveLength(1);
    });

    it('should handle clearing non-existent address', () => {
      // Should not throw
      expect(() => clearPortfolioHistory('0xnonexistent')).not.toThrow();
    });
  });

  describe('clearAllPortfolioHistory', () => {
    it('should remove all history', () => {
      const address2 = '0xabcdef1234567890abcdef1234567890abcdef12';

      addPortfolioSnapshot(testAddress, 1000);
      vi.advanceTimersByTime(6 * 60 * 1000);
      addPortfolioSnapshot(address2, 2000);

      clearAllPortfolioHistory();

      expect(getPortfolioHistory(testAddress)).toHaveLength(0);
      expect(getPortfolioHistory(address2)).toHaveLength(0);
    });
  });

  describe('multi-wallet isolation', () => {
    it('should keep history separate per wallet', () => {
      const address2 = '0xabcdef1234567890abcdef1234567890abcdef12';

      addPortfolioSnapshot(testAddress, 1000);
      addPortfolioSnapshot(address2, 5000);

      const history1 = getPortfolioHistory(testAddress);
      const history2 = getPortfolioHistory(address2);

      expect(history1[0].v).toBe(1000);
      expect(history2[0].v).toBe(5000);
    });
  });
});
