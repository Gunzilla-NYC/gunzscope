// lib/hooks/__tests__/usePortfolioPnL.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePortfolioPnL } from '../usePortfolioPnL';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePortfolioPnL', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null costBasis when address is empty', () => {
    const { result } = renderHook(() => usePortfolioPnL(''));

    expect(result.current.costBasis).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches P&L data when address is provided', async () => {
    const mockPnLData = {
      success: true,
      data: {
        totalCostBasisUSD: 500,
        nftsWithCostBasis: 10,
        totalNFTs: 12,
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPnLData),
    });

    const { result } = renderHook(() =>
      usePortfolioPnL('0x1234567890123456789012345678901234567890')
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.costBasis).toEqual({
      tokens: null,
      nfts: 500,
      total: 500,
    });
    expect(result.current.coverage).toBe(10 / 12);
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      usePortfolioPnL('0x1234567890123456789012345678901234567890')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.costBasis).toBeNull();
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() =>
      usePortfolioPnL('0x1234567890123456789012345678901234567890', { enabled: false })
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
