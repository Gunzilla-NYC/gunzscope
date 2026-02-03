import { describe, it, expect } from 'vitest';
import { calcPortfolio, CalcPortfolioInput } from '../calcPortfolio';
import { WalletData, NFT } from '@/lib/types';

// Helper to create minimal wallet data for testing
function createWalletData(overrides: Partial<WalletData> = {}): WalletData {
  return {
    address: '0x1234567890123456789012345678901234567890',
    avalanche: {
      gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
      nfts: [],
    },
    solana: {
      gunToken: { balance: 0, decimals: 9, symbol: 'GUN' },
      nfts: [],
    },
    totalValue: 0,
    lastUpdated: new Date(),
    ...overrides,
  };
}

// Helper to create NFT test data
function createNFT(overrides: Partial<NFT> = {}): NFT {
  return {
    tokenId: '1',
    name: 'Test NFT',
    image: 'https://example.com/nft.png',
    collection: 'Test Collection',
    chain: 'avalanche',
    quantity: 1,
    ...overrides,
  };
}

describe('calcPortfolio', () => {
  describe('token calculations', () => {
    it('should calculate zero total for empty wallet', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData(),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.totalUsd).toBe(0);
      expect(result.tokensUsd).toBe(0);
      expect(result.nftsUsd).toBe(0);
    });

    it('should calculate Avalanche GUN token value', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.tokensUsd).toBe(10); // 1000 * 0.01
      expect(result.avalancheGunBalance).toBe(1000);
      expect(result.totalGunBalance).toBe(1000);
    });

    it('should calculate Solana GUN token value', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          solana: {
            gunToken: { balance: 500, decimals: 9, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.02,
      };
      const result = calcPortfolio(input);
      expect(result.tokensUsd).toBe(10); // 500 * 0.02
      expect(result.solanaGunBalance).toBe(500);
    });

    it('should sum Avalanche and Solana GUN balances', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 500, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
          solana: {
            gunToken: { balance: 500, decimals: 9, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.totalGunBalance).toBe(1000);
      expect(result.tokensUsd).toBe(10); // 1000 * 0.01
    });

    it('should handle null gunToken gracefully', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: null,
            nfts: [],
          },
          solana: {
            gunToken: null,
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.totalGunBalance).toBe(0);
      expect(result.tokensUsd).toBe(0);
    });
  });

  describe('NFT calculations', () => {
    it('should calculate NFT value from purchasePriceGun', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
            nfts: [createNFT({ tokenId: '1', purchasePriceGun: 100, quantity: 1 })],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftsUsd).toBe(1); // 100 * 0.01
      expect(result.nftsWithPrice).toBe(1);
    });

    it('should handle NFT quantity multiplier', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
            nfts: [createNFT({ tokenId: '1', purchasePriceGun: 100, quantity: 3 })],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftsUsd).toBe(3); // 100 * 0.01 * 3
      expect(result.nftsWithPrice).toBe(3);
    });

    it('should track NFTs without price data', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
            nfts: [
              createNFT({ tokenId: '1', quantity: 1 }), // No price
              createNFT({ tokenId: '2', purchasePriceGun: 100, quantity: 1 }),
            ],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftsWithPrice).toBe(1);
      expect(result.nftsWithoutPrice).toBe(1);
      expect(result.nftUsdReliable).toBe(false); // <50% coverage
    });

    it('should set nftUsdReliable true when >50% have prices', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
            nfts: [
              createNFT({ tokenId: '1', purchasePriceGun: 100, quantity: 1 }),
              createNFT({ tokenId: '2', purchasePriceGun: 200, quantity: 1 }),
              createNFT({ tokenId: '3', quantity: 1 }), // No price
            ],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftUsdReliable).toBe(true); // 66% coverage
    });

    it('should handle zero purchasePriceGun as no price', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
            nfts: [createNFT({ tokenId: '1', purchasePriceGun: 0, quantity: 1 })],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftsWithPrice).toBe(0);
      expect(result.nftsWithoutPrice).toBe(1);
    });

    it('should sum NFTs from both Avalanche and Solana', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: null,
            nfts: [createNFT({ tokenId: '1', purchasePriceGun: 100, quantity: 1 })],
          },
          solana: {
            gunToken: null,
            nfts: [createNFT({ tokenId: '2', purchasePriceGun: 200, quantity: 1, chain: 'solana' })],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftsUsd).toBe(3); // (100 + 200) * 0.01
      expect(result.nftsWithPrice).toBe(2);
    });
  });

  describe('breakdown array', () => {
    it('should generate correct breakdown percentages', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 5000, decimals: 18, symbol: 'GUN' },
            nfts: [createNFT({ tokenId: '1', purchasePriceGun: 500, quantity: 1 })],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      // Total: 50 (tokens) + 5 (NFT) = 55
      expect(result.totalUsd).toBe(55);
      expect(result.breakdown).toHaveLength(2);

      const gunBreakdown = result.breakdown.find(b => b.key === 'avalanche_gun');
      expect(gunBreakdown?.usd).toBe(50);
      expect(gunBreakdown?.pct).toBeCloseTo(90.9, 1); // 50/55 * 100

      const nftBreakdown = result.breakdown.find(b => b.key === 'nfts');
      expect(nftBreakdown?.usd).toBe(5);
      expect(nftBreakdown?.pct).toBeCloseTo(9.1, 1); // 5/55 * 100
    });

    it('should not include zero-value items in breakdown', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
          solana: {
            gunToken: { balance: 0, decimals: 9, symbol: 'GUN' }, // Zero balance
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      // Should only have Avalanche GUN, not Solana with 0 balance
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].key).toBe('avalanche_gun');
    });

    it('should include tokens with balance but zero USD (when price is 0)', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0, // Zero price
      };
      const result = calcPortfolio(input);
      // Should include because balance > 0 even though USD is 0
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].key).toBe('avalanche_gun');
      expect(result.breakdown[0].usd).toBe(0);
    });
  });

  describe('invariants', () => {
    it('should pass invariants for valid calculation', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.invariants.ok).toBe(true);
      expect(result.invariants.warnings).toHaveLength(0);
    });

    it('should warn when GUN price is unavailable', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: undefined,
      };
      const result = calcPortfolio(input);
      expect(result.invariants.warnings).toContain('GUN price unavailable or invalid');
    });

    it('should warn when GUN price is zero', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0,
      };
      const result = calcPortfolio(input);
      expect(result.invariants.warnings).toContain('GUN price unavailable or invalid');
    });

    it('should warn when no NFT price data available', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: null,
            nfts: [createNFT({ tokenId: '1', quantity: 1 })], // No price
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.invariants.warnings).toContain('No NFT price data available');
    });

    it('should warn about partial NFT coverage', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: null,
            nfts: [
              createNFT({ tokenId: '1', purchasePriceGun: 100, quantity: 1 }),
              createNFT({ tokenId: '2', quantity: 1 }), // No price
              createNFT({ tokenId: '3', quantity: 1 }), // No price
            ],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      // 33% coverage, should warn
      const partialWarning = result.invariants.warnings.find(w => w.includes('partial value'));
      expect(partialWarning).toBeDefined();
    });

    it('should validate percentage sum equals 100', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [createNFT({ tokenId: '1', purchasePriceGun: 500, quantity: 1 })],
          },
          solana: {
            gunToken: { balance: 500, decimals: 9, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      const pctSum = result.breakdown.reduce((sum, item) => sum + item.pct, 0);
      expect(pctSum).toBeCloseTo(100, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero GUN price gracefully', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0,
      };
      const result = calcPortfolio(input);
      expect(result.totalUsd).toBe(0);
      expect(result.totalGunBalance).toBe(1000);
    });

    it('should handle negative GUN price as invalid', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: -0.01,
      };
      const result = calcPortfolio(input);
      expect(result.totalUsd).toBe(0);
      expect(result.invariants.warnings).toContain('GUN price unavailable or invalid');
    });

    it('should handle NaN GUN price as invalid', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: NaN,
      };
      const result = calcPortfolio(input);
      expect(result.totalUsd).toBe(0);
      expect(result.invariants.warnings).toContain('GUN price unavailable or invalid');
    });

    it('should handle Infinity GUN price as invalid', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: Infinity,
      };
      const result = calcPortfolio(input);
      expect(result.totalUsd).toBe(0);
    });

    it('should use totalOwnedNftCount override when provided', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 0, decimals: 18, symbol: 'GUN' },
            nfts: [createNFT({ tokenId: '1', quantity: 1 })],
          },
        }),
        gunPrice: 0.01,
        totalOwnedNftCount: 100,
      };
      const result = calcPortfolio(input);
      expect(result.nftCount).toBe(100);
    });

    it('should default nftCount to summed quantities when no override', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: null,
            nfts: [
              createNFT({ tokenId: '1', quantity: 2 }),
              createNFT({ tokenId: '2', quantity: 3 }),
            ],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftCount).toBe(5);
    });

    it('should handle NFT with undefined quantity as 1', () => {
      const nft = createNFT({ tokenId: '1', purchasePriceGun: 100 });
      delete (nft as any).quantity; // Simulate undefined quantity

      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: null,
            nfts: [nft],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.nftsUsd).toBe(1); // 100 * 0.01 * 1
      expect(result.nftsWithPrice).toBe(1);
    });

    it('should handle very small GUN price', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1000000, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.000001,
      };
      const result = calcPortfolio(input);
      expect(result.tokensUsd).toBeCloseTo(1, 5); // 1000000 * 0.000001
    });

    it('should handle very large balance', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 1e12, decimals: 18, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      expect(result.tokensUsd).toBe(1e10); // 1e12 * 0.01
    });
  });

  describe('combined portfolio', () => {
    it('should calculate correct total for tokens + NFTs', () => {
      const input: CalcPortfolioInput = {
        walletData: createWalletData({
          avalanche: {
            gunToken: { balance: 10000, decimals: 18, symbol: 'GUN' },
            nfts: [
              createNFT({ tokenId: '1', purchasePriceGun: 1000, quantity: 1 }),
              createNFT({ tokenId: '2', purchasePriceGun: 500, quantity: 2 }),
            ],
          },
          solana: {
            gunToken: { balance: 5000, decimals: 9, symbol: 'GUN' },
            nfts: [],
          },
        }),
        gunPrice: 0.01,
      };
      const result = calcPortfolio(input);
      // Tokens: (10000 + 5000) * 0.01 = 150
      // NFTs: (1000 + 500*2) * 0.01 = 20
      // Total: 170
      expect(result.tokensUsd).toBe(150);
      expect(result.nftsUsd).toBe(20);
      expect(result.totalUsd).toBe(170);
    });
  });
});
