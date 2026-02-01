import { describe, it, expect } from 'vitest';
import { calculateCollectionBreakdown } from '../collectionBreakdown';
import type { NFT } from '@/lib/types';

describe('calculateCollectionBreakdown', () => {
  const makeNFT = (collection: string, priceGun?: number, quantity?: number): NFT => ({
    tokenId: '1',
    name: 'Test NFT',
    image: 'https://example.com/img.png',
    collection,
    chain: 'avalanche' as const,
    purchasePriceGun: priceGun,
    quantity,
  });

  it('should return empty breakdown for no NFTs', () => {
    const result = calculateCollectionBreakdown([], 0.10);
    expect(result.collections).toEqual([]);
    expect(result.totalNftValueUsd).toBe(0);
    expect(result.totalNftCount).toBe(0);
  });

  it('should group NFTs by collection', () => {
    const nfts: NFT[] = [
      makeNFT('OTG Genesis', 100),
      makeNFT('OTG Genesis', 150),
      makeNFT('Hex Weapons', 50),
    ];
    const result = calculateCollectionBreakdown(nfts, 0.10);

    expect(result.collections).toHaveLength(2);

    const genesis = result.collections.find(c => c.name === 'OTG Genesis');
    expect(genesis?.count).toBe(2);
    expect(genesis?.valueUsd).toBe(25); // (100 + 150) * 0.10

    const weapons = result.collections.find(c => c.name === 'Hex Weapons');
    expect(weapons?.count).toBe(1);
    expect(weapons?.valueUsd).toBe(5); // 50 * 0.10
  });

  it('should sort collections by value descending', () => {
    const nfts: NFT[] = [
      makeNFT('Small', 10),
      makeNFT('Large', 1000),
      makeNFT('Medium', 100),
    ];
    const result = calculateCollectionBreakdown(nfts, 0.10);

    expect(result.collections[0].name).toBe('Large');
    expect(result.collections[1].name).toBe('Medium');
    expect(result.collections[2].name).toBe('Small');
  });

  it('should handle NFTs without price (unpriced)', () => {
    const nfts: NFT[] = [
      makeNFT('Priced', 100),
      makeNFT('Unpriced', undefined),
    ];
    const result = calculateCollectionBreakdown(nfts, 0.10);

    expect(result.totalNftCount).toBe(2);
    expect(result.unpricedCount).toBe(1);
    expect(result.totalNftValueUsd).toBe(10); // Only priced one
  });

  it('should calculate percentages of NFT total', () => {
    const nfts: NFT[] = [
      makeNFT('A', 600), // 60% of NFT value
      makeNFT('B', 400), // 40% of NFT value
    ];
    const result = calculateCollectionBreakdown(nfts, 0.10);

    expect(result.collections[0].percentOfNfts).toBe(60);
    expect(result.collections[1].percentOfNfts).toBe(40);
  });

  it('should handle NFTs with quantity > 1', () => {
    const nfts: NFT[] = [
      makeNFT('Bulk', 100, 5), // 5 copies at 100 GUN each
    ];
    const result = calculateCollectionBreakdown(nfts, 0.10);

    expect(result.totalNftCount).toBe(5);
    expect(result.collections[0].count).toBe(5);
    expect(result.collections[0].valueGun).toBe(500); // 100 * 5
    expect(result.collections[0].valueUsd).toBe(50); // 500 * 0.10
  });

  it('should handle unknown collection names', () => {
    const nft: NFT = {
      tokenId: '1',
      name: 'Unnamed',
      image: 'https://example.com/img.png',
      collection: '', // Empty collection
      chain: 'avalanche',
      purchasePriceGun: 100,
    };
    const result = calculateCollectionBreakdown([nft], 0.10);

    expect(result.collections[0].name).toBe('Unknown Collection');
  });

  it('should calculate total values correctly', () => {
    const nfts: NFT[] = [
      makeNFT('A', 100),
      makeNFT('B', 200),
      makeNFT('C', 300),
    ];
    const gunPrice = 0.05;
    const result = calculateCollectionBreakdown(nfts, gunPrice);

    expect(result.totalNftValueGun).toBe(600);
    expect(result.totalNftValueUsd).toBe(30); // 600 * 0.05
  });
});
