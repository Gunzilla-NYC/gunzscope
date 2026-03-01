import { generateInsights, PortfolioInsight } from '../portfolioInsights';
import { NFT } from '@/lib/types';

// Helper to create mock NFT
const createMockNFT = (overrides: Partial<NFT>): NFT => ({
  tokenId: '1',
  name: 'Test NFT',
  image: 'https://example.com/image.png',
  collection: 'Test Collection',
  chain: 'avalanche',
  ...overrides,
});

describe('generateInsights', () => {
  it('returns empty array for no NFTs', () => {
    expect(generateInsights([], 0.05)).toEqual([]);
  });

  it('returns empty array when gunPrice is undefined', () => {
    const nfts = [createMockNFT({ purchasePriceGun: 100, floorPrice: 200 })];
    expect(generateInsights(nfts, undefined)).toEqual([]);
  });

  it('returns empty array when gunPrice is 0', () => {
    const nfts = [createMockNFT({ purchasePriceGun: 100, floorPrice: 200 })];
    expect(generateInsights(nfts, 0)).toEqual([]);
  });

  it('identifies best performer by percentage gain', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', name: 'Vulture', purchasePriceGun: 100, floorPrice: 200 }),
      createMockNFT({ tokenId: '2', name: 'Kestrel', purchasePriceGun: 100, floorPrice: 150 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const bestPerformer = insights.find(i => i.type === 'best_performer');
    expect(bestPerformer).toBeDefined();
    expect(bestPerformer?.nftName).toBe('Vulture');
    expect(bestPerformer?.value).toBe('+100%');
    expect(bestPerformer?.isPositive).toBe(true);
  });

  it('does not include best performer if all NFTs are negative', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', name: 'Vulture', purchasePriceGun: 200, floorPrice: 100 }),
      createMockNFT({ tokenId: '2', name: 'Kestrel', purchasePriceGun: 200, floorPrice: 150 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const bestPerformer = insights.find(i => i.type === 'best_performer');
    expect(bestPerformer).toBeUndefined();
  });

  it('counts NFTs below cost basis', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', purchasePriceGun: 200, floorPrice: 100 }),
      createMockNFT({ tokenId: '2', purchasePriceGun: 100, floorPrice: 150 }),
      createMockNFT({ tokenId: '3', purchasePriceGun: 150, floorPrice: 100 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const belowCost = insights.find(i => i.type === 'below_cost');
    expect(belowCost).toBeDefined();
    expect(belowCost?.value).toBe('2 of 3');
    expect(belowCost?.isPositive).toBe(false);
  });

  it('counts individual NFTs when quantity > 1', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', purchasePriceGun: 200, floorPrice: 100, quantity: 2 }),
      createMockNFT({ tokenId: '2', purchasePriceGun: 100, floorPrice: 150 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const belowCost = insights.find(i => i.type === 'below_cost');
    expect(belowCost).toBeDefined();
    expect(belowCost?.value).toBe('2 of 3');
  });

  it('does not include below_cost insight if none are below cost', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', purchasePriceGun: 100, floorPrice: 200 }),
      createMockNFT({ tokenId: '2', purchasePriceGun: 100, floorPrice: 150 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const belowCost = insights.find(i => i.type === 'below_cost');
    expect(belowCost).toBeUndefined();
  });

  it('respects maxInsights limit', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', name: 'Best', purchasePriceGun: 100, floorPrice: 300 }),
      createMockNFT({ tokenId: '2', purchasePriceGun: 200, floorPrice: 100 }),
    ];
    const insights = generateInsights(nfts, 0.05, 1);
    expect(insights.length).toBeLessThanOrEqual(1);
  });

  it('ignores NFTs without purchase price', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', name: 'No Cost', floorPrice: 200 }),
      createMockNFT({ tokenId: '2', name: 'With Cost', purchasePriceGun: 100, floorPrice: 200 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const bestPerformer = insights.find(i => i.type === 'best_performer');
    expect(bestPerformer?.nftName).toBe('With Cost');
  });

  it('ignores NFTs without floor price', () => {
    const nfts: NFT[] = [
      createMockNFT({ tokenId: '1', name: 'No Floor', purchasePriceGun: 100 }),
      createMockNFT({ tokenId: '2', name: 'With Floor', purchasePriceGun: 100, floorPrice: 200 }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const bestPerformer = insights.find(i => i.type === 'best_performer');
    expect(bestPerformer?.nftName).toBe('With Floor');
  });

  it('uses nft.name for insight nftName', () => {
    const nfts: NFT[] = [
      createMockNFT({
        tokenId: '1',
        name: 'Display Name',
        purchasePriceGun: 100,
        floorPrice: 200,
      }),
    ];
    const insights = generateInsights(nfts, 0.05);
    const bestPerformer = insights.find(i => i.type === 'best_performer');
    expect(bestPerformer?.nftName).toBe('Display Name');
  });
});
