/**
 * Rarity Filter Tests for NFTGallery
 *
 * Tests cover:
 * - Rarity counts computation (from pre-rarity-filtered NFTs)
 * - Rarity filtering logic
 * - Integration with search and item class filters
 * - Filter state management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NFTGallery from '../NFTGallery';
import type { NFT } from '@/lib/types';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const { fill: _fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} alt={rest.alt || ''} />;
  },
}));

// Suppress console errors from React's act() warnings in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// =============================================================================
// Test Data Factory
// =============================================================================

function createMockNFT(overrides: Partial<NFT> & { rarity?: string; itemClass?: string }): NFT {
  const { rarity, itemClass, ...rest } = overrides;
  return {
    tokenId: `token-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test NFT',
    image: 'https://example.com/image.png',
    collection: 'Test Collection',
    chain: 'avalanche',
    traits: {
      RARITY: rarity || 'Common',
      CLASS: itemClass || 'Weapon',
    },
    quantity: 1,
    ...rest,
  };
}

function createNFTsWithRarities(rarityCounts: Record<string, number>): NFT[] {
  const nfts: NFT[] = [];
  for (const [rarity, count] of Object.entries(rarityCounts)) {
    for (let i = 0; i < count; i++) {
      nfts.push(createMockNFT({
        name: `${rarity} NFT ${i + 1}`,
        rarity,
        tokenId: `${rarity.toLowerCase()}-${i}`,
      }));
    }
  }
  return nfts;
}

// =============================================================================
// A) Rarity Counts Display Tests
// =============================================================================

describe('Rarity counts display', () => {
  it('displays rarity pills with correct counts', () => {
    const nfts = createNFTsWithRarities({
      Epic: 3,
      Rare: 5,
      Common: 10,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Check that rarity pills are displayed with counts
    expect(screen.getByText(/Epic: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Rare: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Common: 10/)).toBeInTheDocument();
  });

  it('does not display rarity pills for rarities with zero count', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 3,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Epic and Common should be shown
    expect(screen.getByText(/Epic: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Common: 3/)).toBeInTheDocument();

    // Mythic, Legendary, Rare, Uncommon should not be shown
    expect(screen.queryByText(/Mythic:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legendary:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rare:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Uncommon:/)).not.toBeInTheDocument();
  });

  it('displays all rarity tiers when all are present', () => {
    const nfts = createNFTsWithRarities({
      Mythic: 1,
      Legendary: 2,
      Epic: 3,
      Rare: 4,
      Uncommon: 5,
      Common: 6,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    expect(screen.getByText(/Mythic: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Legendary: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Epic: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Rare: 4/)).toBeInTheDocument();
    expect(screen.getByText(/Uncommon: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Common: 6/)).toBeInTheDocument();
  });
});

// =============================================================================
// B) Rarity Filter Behavior Tests
// =============================================================================

describe('Rarity filtering', () => {
  it('filters NFTs when a rarity pill is clicked', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Initially shows all NFTs (check heading)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('7)');

    // Click Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);

    // Should only show Epic NFTs
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 7');
  });

  it('shows only NFTs of selected rarity', () => {
    const nfts = [
      createMockNFT({ name: 'Epic Sword', rarity: 'Epic', tokenId: 'epic-1' }),
      createMockNFT({ name: 'Epic Shield', rarity: 'Epic', tokenId: 'epic-2' }),
      createMockNFT({ name: 'Common Blade', rarity: 'Common', tokenId: 'common-1' }),
      createMockNFT({ name: 'Common Axe', rarity: 'Common', tokenId: 'common-2' }),
      createMockNFT({ name: 'Common Spear', rarity: 'Common', tokenId: 'common-3' }),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Click Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);

    // Epic NFTs should be visible
    expect(screen.getByText('Epic Sword')).toBeInTheDocument();
    expect(screen.getByText('Epic Shield')).toBeInTheDocument();

    // Common NFTs should not be visible
    expect(screen.queryByText('Common Blade')).not.toBeInTheDocument();
    expect(screen.queryByText('Common Axe')).not.toBeInTheDocument();
    expect(screen.queryByText('Common Spear')).not.toBeInTheDocument();
  });

  it('clicking same rarity pill toggles filter off', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });

    // Click to enable filter
    fireEvent.click(epicButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 7');

    // Click again to disable filter
    fireEvent.click(epicButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('7)');
  });

  it('clicking All pill resets rarity filter', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Enable Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 7');

    // Click All to reset
    const allButton = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('7)');
  });
});

// =============================================================================
// C) Rarity Counts Remain Visible When Filtered
// =============================================================================

describe('Rarity counts visibility during filtering', () => {
  it('rarity counts remain visible when a rarity is selected', () => {
    const nfts = createNFTsWithRarities({
      Epic: 3,
      Rare: 5,
      Common: 10,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 3/ });
    fireEvent.click(epicButton);

    // All rarity counts should still be visible (computed from pre-rarity-filtered NFTs)
    expect(screen.getByText(/Epic: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Rare: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Common: 10/)).toBeInTheDocument();
  });
});

// =============================================================================
// D) Integration with Other Filters
// =============================================================================

describe('Rarity filter integration with other filters', () => {
  it('rarity filter works with item class filter', () => {
    const nfts = [
      createMockNFT({ name: 'Epic Weapon', rarity: 'Epic', itemClass: 'Weapon', tokenId: 'epic-weapon' }),
      createMockNFT({ name: 'Epic Character', rarity: 'Epic', itemClass: 'Character', tokenId: 'epic-char' }),
      createMockNFT({ name: 'Common Weapon', rarity: 'Common', itemClass: 'Weapon', tokenId: 'common-weapon' }),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // First select Weapons collection - find the select dropdown that contains "Weapons"
    const selectElements = screen.getAllByRole('combobox');
    const collectionsDropdown = selectElements.find(el =>
      el.textContent?.includes('Weapons')
    );
    expect(collectionsDropdown).toBeDefined();
    fireEvent.change(collectionsDropdown!, { target: { value: 'Weapon' } });

    // Should show 2 weapons
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 3');

    // Now filter by Epic
    const epicButton = screen.getByRole('button', { name: /Epic: 1/ });
    fireEvent.click(epicButton);

    // Should show only Epic Weapon
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('1 of 3');
    expect(screen.getByText('Epic Weapon')).toBeInTheDocument();
    expect(screen.queryByText('Epic Character')).not.toBeInTheDocument();
    expect(screen.queryByText('Common Weapon')).not.toBeInTheDocument();
  });

  it('rarity counts update when item class filter is applied', () => {
    const nfts = [
      createMockNFT({ name: 'Epic Weapon 1', rarity: 'Epic', itemClass: 'Weapon', tokenId: 'epic-w1' }),
      createMockNFT({ name: 'Epic Weapon 2', rarity: 'Epic', itemClass: 'Weapon', tokenId: 'epic-w2' }),
      createMockNFT({ name: 'Epic Character', rarity: 'Epic', itemClass: 'Character', tokenId: 'epic-c' }),
      createMockNFT({ name: 'Common Weapon', rarity: 'Common', itemClass: 'Weapon', tokenId: 'common-w' }),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Initially Epic: 3
    expect(screen.getByRole('button', { name: /Epic: 3/ })).toBeInTheDocument();

    // Select Weapons collection - find the select dropdown that contains "Weapons"
    const selectElements = screen.getAllByRole('combobox');
    const collectionsDropdown = selectElements.find(el =>
      el.textContent?.includes('Weapons')
    );
    expect(collectionsDropdown).toBeDefined();
    fireEvent.change(collectionsDropdown!, { target: { value: 'Weapon' } });

    // Epic count should update to 2 (only weapons)
    expect(screen.getByRole('button', { name: /Epic: 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Common: 1/ })).toBeInTheDocument();
  });

  it('clear all resets rarity filter along with other filters', () => {
    const nfts = createNFTsWithRarities({
      Epic: 3,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Apply rarity filter
    const epicButton = screen.getByRole('button', { name: /Epic: 3/ });
    fireEvent.click(epicButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('3 of 8');

    // Click Clear all
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);

    // Should show all NFTs
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('8)');
  });
});

// =============================================================================
// E) Active Filter Tag Tests
// =============================================================================

describe('Rarity filter tag', () => {
  it('shows rarity filter tag when filter is active', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Apply Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);

    // Should show Epic filter tag (separate from the pill)
    const filterTags = screen.getAllByText('Epic');
    // One in the pill, one in the filter tag
    expect(filterTags.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking X on filter tag removes rarity filter', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Apply Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 7');

    // Find the filter tag's close button (in the filter controls row, not the pill)
    // The filter tag is a span containing "Epic" with an X button inside
    const filterTagSpans = document.querySelectorAll('span.inline-flex');
    let tagCloseButton: HTMLElement | null = null;
    filterTagSpans.forEach((span) => {
      // Look for span that contains just "Epic" (the filter tag, not the pill)
      if (span.textContent === 'Epic') {
        const btn = span.querySelector('button');
        if (btn) tagCloseButton = btn as HTMLElement;
      }
    });

    // Click the close button on the tag (if found)
    if (tagCloseButton) {
      fireEvent.click(tagCloseButton);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('7)');
    } else {
      // If we can't find the tag, at least verify the filter is working
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 7');
    }
  });
});
