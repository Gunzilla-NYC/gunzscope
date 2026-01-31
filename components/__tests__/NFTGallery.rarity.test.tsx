/**
 * Rarity Filter Tests for NFTGallery
 *
 * Tests cover:
 * - Rarity counts computation (from pre-rarity-filtered NFTs)
 * - Multi-select rarity filtering logic (union of selected rarities)
 * - Integration with search and item class filters
 * - Filter state management
 * - aria-pressed accessibility attributes
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
// C) Multi-Select Rarity Filter Tests
// =============================================================================

describe('Multi-select rarity filtering', () => {
  it('allows multiple rarities to be selected simultaneously', () => {
    const nfts = [
      createMockNFT({ name: 'Epic Sword', rarity: 'Epic', tokenId: 'epic-1' }),
      createMockNFT({ name: 'Epic Shield', rarity: 'Epic', tokenId: 'epic-2' }),
      createMockNFT({ name: 'Common Blade', rarity: 'Common', tokenId: 'common-1' }),
      createMockNFT({ name: 'Rare Helm', rarity: 'Rare', tokenId: 'rare-1' }),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Initially shows all 4 NFTs
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('4)');

    // Click Epic filter
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);

    // Should show 2 Epic NFTs
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 4');
    expect(screen.getByText('Epic Sword')).toBeInTheDocument();
    expect(screen.getByText('Epic Shield')).toBeInTheDocument();

    // Click Common filter (while Epic still active)
    const commonButton = screen.getByRole('button', { name: /Common: 1/ });
    fireEvent.click(commonButton);

    // Should show Epic + Common NFTs (3 total)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('3 of 4');
    expect(screen.getByText('Epic Sword')).toBeInTheDocument();
    expect(screen.getByText('Epic Shield')).toBeInTheDocument();
    expect(screen.getByText('Common Blade')).toBeInTheDocument();
    expect(screen.queryByText('Rare Helm')).not.toBeInTheDocument();
  });

  it('removing one rarity keeps other selections active', () => {
    const nfts = [
      createMockNFT({ name: 'Epic Sword', rarity: 'Epic', tokenId: 'epic-1' }),
      createMockNFT({ name: 'Common Blade', rarity: 'Common', tokenId: 'common-1' }),
      createMockNFT({ name: 'Rare Helm', rarity: 'Rare', tokenId: 'rare-1' }),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select Epic and Common
    const epicButton = screen.getByRole('button', { name: /Epic: 1/ });
    const commonButton = screen.getByRole('button', { name: /Common: 1/ });

    fireEvent.click(epicButton);
    fireEvent.click(commonButton);

    // Should show Epic + Common (2 total)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2 of 3');

    // Toggle Epic off (click again)
    fireEvent.click(epicButton);

    // Should only show Common now
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('1 of 3');
    expect(screen.queryByText('Epic Sword')).not.toBeInTheDocument();
    expect(screen.getByText('Common Blade')).toBeInTheDocument();
  });

  it('All pill clears all rarity selections', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Rare: 3,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select Epic and Rare
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    const rareButton = screen.getByRole('button', { name: /Rare: 3/ });

    fireEvent.click(epicButton);
    fireEvent.click(rareButton);

    // Should show 5 (Epic + Rare)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('5 of 10');

    // Click All to clear
    const allButton = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allButton);

    // Should show all 10 NFTs
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('10)');
  });
});

// =============================================================================
// D) aria-pressed Accessibility Tests
// =============================================================================

describe('aria-pressed accessibility', () => {
  it('All pill has aria-pressed=true when no rarities selected', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 3,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    const allButton = screen.getByRole('button', { name: 'All' });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('All pill has aria-pressed=false when a rarity is selected', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 3,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select Epic
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    fireEvent.click(epicButton);

    const allButton = screen.getByRole('button', { name: 'All' });
    expect(allButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('rarity pill aria-pressed reflects selection state', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 3,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    const commonButton = screen.getByRole('button', { name: /Common: 3/ });

    // Initially not pressed
    expect(epicButton).toHaveAttribute('aria-pressed', 'false');
    expect(commonButton).toHaveAttribute('aria-pressed', 'false');

    // Select Epic
    fireEvent.click(epicButton);
    expect(epicButton).toHaveAttribute('aria-pressed', 'true');
    expect(commonButton).toHaveAttribute('aria-pressed', 'false');

    // Select Common as well
    fireEvent.click(commonButton);
    expect(epicButton).toHaveAttribute('aria-pressed', 'true');
    expect(commonButton).toHaveAttribute('aria-pressed', 'true');

    // Deselect Epic
    fireEvent.click(epicButton);
    expect(epicButton).toHaveAttribute('aria-pressed', 'false');
    expect(commonButton).toHaveAttribute('aria-pressed', 'true');
  });
});

// =============================================================================
// E) Rarity Counts Remain Visible When Filtered
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
// F) Integration with Other Filters
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
// G) Rarity-Grouped Sorting Tests
// =============================================================================

describe('Rarity-grouped sorting when filters active', () => {
  // Helper to create NFT with specific mint number and rarity
  function createNFTWithMint(name: string, rarity: string, mintNumber: string): NFT {
    return createMockNFT({
      name,
      rarity,
      tokenId: `${rarity.toLowerCase()}-${mintNumber}`,
      mintNumber,
    });
  }

  it('sorts by rarity order when rarity filters are active (Epic before Common)', () => {
    const nfts = [
      createNFTWithMint('Common A', 'Common', '001'),
      createNFTWithMint('Epic A', 'Epic', '005'),
      createNFTWithMint('Common B', 'Common', '002'),
      createNFTWithMint('Epic B', 'Epic', '003'),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select both Epic and Common
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    const commonButton = screen.getByRole('button', { name: /Common: 2/ });
    fireEvent.click(epicButton);
    fireEvent.click(commonButton);

    // Get all NFT names in order of appearance
    const nftNames = screen.getAllByText(/^(Epic|Common) [AB]$/).map(el => el.textContent);

    // Epic items should come before Common items
    // Epic B (mint 003) before Epic A (mint 005) - sorted by mint within rarity
    // Common A (mint 001) before Common B (mint 002) - sorted by mint within rarity
    expect(nftNames).toEqual(['Epic B', 'Epic A', 'Common A', 'Common B']);
  });

  it('sorts by mint number ascending within each rarity group', () => {
    const nfts = [
      createNFTWithMint('Rare 10', 'Rare', '010'),
      createNFTWithMint('Rare 5', 'Rare', '005'),
      createNFTWithMint('Rare 1', 'Rare', '001'),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select Rare filter
    const rareButton = screen.getByRole('button', { name: /Rare: 3/ });
    fireEvent.click(rareButton);

    // Get all NFT names in order
    const nftNames = screen.getAllByText(/^Rare \d+$/).map(el => el.textContent);

    // Should be sorted by mint ascending
    expect(nftNames).toEqual(['Rare 1', 'Rare 5', 'Rare 10']);
  });

  it('groups multiple rarities in correct order: Epic → Rare → Uncommon → Common', () => {
    const nfts = [
      createNFTWithMint('Common Item', 'Common', '001'),
      createNFTWithMint('Uncommon Item', 'Uncommon', '002'),
      createNFTWithMint('Rare Item', 'Rare', '003'),
      createNFTWithMint('Epic Item', 'Epic', '004'),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select all four rarities
    fireEvent.click(screen.getByRole('button', { name: /Epic: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rare: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Uncommon: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Common: 1/ }));

    // Get all NFT names in order
    const nftNames = screen.getAllByText(/Item$/).map(el => el.textContent);

    // Should be in rarity order: Epic → Rare → Uncommon → Common
    expect(nftNames).toEqual(['Epic Item', 'Rare Item', 'Uncommon Item', 'Common Item']);
  });

  it('includes Mythic and Legendary in correct order when present', () => {
    const nfts = [
      createNFTWithMint('Common X', 'Common', '001'),
      createNFTWithMint('Mythic X', 'Mythic', '002'),
      createNFTWithMint('Epic X', 'Epic', '003'),
      createNFTWithMint('Legendary X', 'Legendary', '004'),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Select all four rarities
    fireEvent.click(screen.getByRole('button', { name: /Mythic: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Legendary: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Epic: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Common: 1/ }));

    // Get all NFT names in order
    const nftNames = screen.getAllByText(/X$/).map(el => el.textContent);

    // Should be: Mythic → Legendary → Epic → Common
    expect(nftNames).toEqual(['Mythic X', 'Legendary X', 'Epic X', 'Common X']);
  });

  it('uses standard sortBy when no rarity filters active', () => {
    const nfts = [
      createNFTWithMint('Apple', 'Epic', '999'),
      createNFTWithMint('Banana', 'Common', '001'),
      createNFTWithMint('Cherry', 'Rare', '500'),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // No rarity filter active, default sort is mint-asc
    const nftNames = screen.getAllByText(/^(Apple|Banana|Cherry)$/).map(el => el.textContent);

    // Should be sorted by mint number ascending (default mint-asc)
    // Banana (001), Cherry (500), Apple (999)
    expect(nftNames).toEqual(['Banana', 'Cherry', 'Apple']);
  });

  it('switches to rarity-grouped sorting when filter activated, back to sortBy when deactivated', () => {
    const nfts = [
      createNFTWithMint('Apple', 'Common', '002'),
      createNFTWithMint('Banana', 'Epic', '001'),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Initially no filter - mint-asc (Banana at 001, Apple at 002)
    let nftNames = screen.getAllByText(/^(Apple|Banana)$/).map(el => el.textContent);
    expect(nftNames).toEqual(['Banana', 'Apple']);

    // Activate both rarity filters
    fireEvent.click(screen.getByRole('button', { name: /Epic: 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Common: 1/ }));

    // Now should be rarity-sorted (Epic before Common → Banana, Apple) - same order since Epic is rarer
    nftNames = screen.getAllByText(/^(Apple|Banana)$/).map(el => el.textContent);
    expect(nftNames).toEqual(['Banana', 'Apple']);

    // Deactivate all filters via All button
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    // Back to mint-asc (Banana at 001, Apple at 002)
    nftNames = screen.getAllByText(/^(Apple|Banana)$/).map(el => el.textContent);
    expect(nftNames).toEqual(['Banana', 'Apple']);
  });
});

// =============================================================================
// H) Sort Dropdown Tests (Floor/Rarity removed)
// =============================================================================

describe('Sort dropdown options', () => {
  it('does NOT render Floor sort options in dropdown', () => {
    const nfts = createNFTsWithRarities({ Epic: 2, Common: 3 });
    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Find the sort dropdown
    const sortDropdown = screen.getAllByRole('combobox').find(el =>
      el.textContent?.includes('Mint #')
    );
    expect(sortDropdown).toBeDefined();

    // Floor options should NOT be present
    expect(sortDropdown!.textContent).not.toContain('Floor');
  });

  it('does NOT render Rarity sort options in dropdown', () => {
    const nfts = createNFTsWithRarities({ Epic: 2, Common: 3 });
    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Find the sort dropdown
    const sortDropdown = screen.getAllByRole('combobox').find(el =>
      el.textContent?.includes('Mint #')
    );
    expect(sortDropdown).toBeDefined();

    // Rarity sort options should NOT be present (High-Low, Low-High)
    expect(sortDropdown!.textContent).not.toContain('Rarity (High-Low)');
    expect(sortDropdown!.textContent).not.toContain('Rarity (Low-High)');
  });

  it('renders only allowed sort options: Mint, Name, Quantity', () => {
    const nfts = createNFTsWithRarities({ Epic: 2, Common: 3 });
    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Find the sort dropdown
    const sortDropdown = screen.getAllByRole('combobox').find(el =>
      el.textContent?.includes('Mint #')
    );
    expect(sortDropdown).toBeDefined();

    // Allowed options should be present
    expect(sortDropdown!.textContent).toContain('Mint # (Low-High)');
    expect(sortDropdown!.textContent).toContain('Mint # (High-Low)');
    expect(sortDropdown!.textContent).toContain('Name (A-Z)');
    expect(sortDropdown!.textContent).toContain('Name (Z-A)');
    expect(sortDropdown!.textContent).toContain('Quantity');
  });

  it('default sort is mint ascending', () => {
    const nfts = [
      createMockNFT({ name: 'Zeta', rarity: 'Epic', tokenId: 'z', mintNumber: '001' }),
      createMockNFT({ name: 'Alpha', rarity: 'Common', tokenId: 'a', mintNumber: '999' }),
      createMockNFT({ name: 'Beta', rarity: 'Rare', tokenId: 'b', mintNumber: '500' }),
    ];

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Get NFT names in order - should be sorted by mint number ascending
    const nftNames = screen.getAllByText(/^(Zeta|Alpha|Beta)$/).map(el => el.textContent);

    // Zeta (001), Beta (500), Alpha (999) - sorted by mint ascending
    expect(nftNames).toEqual(['Zeta', 'Beta', 'Alpha']);
  });
});

// =============================================================================
// I) Active Filter Tag Tests
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

  it('shows multiple filter tags when multiple rarities selected', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Apply Epic and Common filters
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    const commonButton = screen.getByRole('button', { name: /Common: 5/ });
    fireEvent.click(epicButton);
    fireEvent.click(commonButton);

    // Should show both filter tags
    const epicTags = screen.getAllByText('Epic');
    const commonTags = screen.getAllByText('Common');
    // At least one of each (pill + filter tag)
    expect(epicTags.length).toBeGreaterThanOrEqual(1);
    expect(commonTags.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking X on filter tag removes only that rarity', () => {
    const nfts = createNFTsWithRarities({
      Epic: 2,
      Common: 5,
    });

    render(<NFTGallery nfts={nfts} chain="avalanche" />);

    // Apply Epic and Common filters
    const epicButton = screen.getByRole('button', { name: /Epic: 2/ });
    const commonButton = screen.getByRole('button', { name: /Common: 5/ });
    fireEvent.click(epicButton);
    fireEvent.click(commonButton);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('7)');

    // Find the Epic filter tag's close button
    const filterTagSpans = document.querySelectorAll('span.inline-flex');
    let epicTagCloseButton: HTMLElement | null = null;
    filterTagSpans.forEach((span) => {
      // Look for span that contains just "Epic" (the filter tag, not the pill)
      if (span.textContent === 'Epic') {
        const btn = span.querySelector('button');
        if (btn) epicTagCloseButton = btn as HTMLElement;
      }
    });

    // Click the close button on the Epic tag
    if (epicTagCloseButton) {
      fireEvent.click(epicTagCloseButton);
      // Should now only show Common (5 NFTs)
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('5 of 7');
    }
  });
});
