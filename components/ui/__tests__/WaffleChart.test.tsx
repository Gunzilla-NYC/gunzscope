import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WaffleChart from '../WaffleChart';

describe('WaffleChart', () => {
  describe('grid rendering', () => {
    it('should render 100 cells', () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          collections={[]}
        />
      );

      const cells = screen.getAllByTestId(/^waffle-cell-/);
      expect(cells).toHaveLength(100);
    });

    it('should fill correct number of cells for GUN', () => {
      render(
        <WaffleChart
          gunPercent={30}
          nftPercent={70}
          collections={[]}
        />
      );

      const gunCells = screen.getAllByTestId(/^waffle-cell-gun/);
      expect(gunCells).toHaveLength(30);
    });

    it('should show empty cells when total < 100%', () => {
      render(
        <WaffleChart
          gunPercent={40}
          nftPercent={30}
          collections={[]}
        />
      );

      const emptyCells = screen.getAllByTestId(/^waffle-cell-empty/);
      expect(emptyCells).toHaveLength(30);
    });

    it('should render with custom size', () => {
      const { container } = render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          collections={[]}
          size={200}
        />
      );

      const grid = container.querySelector('[data-testid="waffle-grid"]');
      expect(grid).toHaveStyle({ width: '200px', height: '200px' });
    });
  });

  describe('collection distribution', () => {
    it('should distribute NFT cells across collections proportionally', () => {
      render(
        <WaffleChart
          gunPercent={0}
          nftPercent={100}
          collections={[
            { name: 'Genesis', percentOfNfts: 60, color: '#96aaff', valueUsd: 600, count: 3 },
            { name: 'Weapons', percentOfNfts: 40, color: '#c4b5fd', valueUsd: 400, count: 2 },
          ]}
        />
      );

      // Genesis should have ~60 cells, Weapons ~40 cells
      const genesisCells = screen.getAllByTestId(/waffle-cell-nft-Genesis/);
      const weaponsCells = screen.getAllByTestId(/waffle-cell-nft-Weapons/);

      expect(genesisCells.length).toBeGreaterThanOrEqual(55);
      expect(genesisCells.length).toBeLessThanOrEqual(65);
      expect(weaponsCells.length).toBeGreaterThanOrEqual(35);
      expect(weaponsCells.length).toBeLessThanOrEqual(45);
    });
  });

  describe('edge cases', () => {
    it('should handle 100% GUN', () => {
      render(<WaffleChart gunPercent={100} nftPercent={0} collections={[]} />);
      const gunCells = screen.getAllByTestId(/^waffle-cell-gun/);
      expect(gunCells).toHaveLength(100);
    });

    it('should handle 100% NFTs', () => {
      render(
        <WaffleChart
          gunPercent={0}
          nftPercent={100}
          collections={[{ name: 'All NFTs', percentOfNfts: 100, color: '#96aaff', valueUsd: 100, count: 10 }]}
        />
      );
      const nftCells = screen.getAllByTestId(/^waffle-cell-nft/);
      expect(nftCells).toHaveLength(100);
    });

    it('should handle empty portfolio', () => {
      render(<WaffleChart gunPercent={0} nftPercent={0} collections={[]} />);
      const emptyCells = screen.getAllByTestId(/^waffle-cell-empty/);
      expect(emptyCells).toHaveLength(100);
    });

    it('should handle single collection', () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          collections={[{ name: 'Only', percentOfNfts: 100, color: '#96aaff', valueUsd: 500, count: 5 }]}
        />
      );
      const nftCells = screen.getAllByTestId(/^waffle-cell-nft/);
      expect(nftCells).toHaveLength(50);
    });
  });

  describe('tooltips', () => {
    it('should show tooltip on GUN cell hover', async () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          gunValueUsd={1000}
          nftValueUsd={1000}
          collections={[{ name: 'Genesis', percentOfNfts: 100, color: '#96aaff', valueUsd: 1000, count: 5 }]}
        />
      );

      const gunCell = screen.getAllByTestId(/^waffle-cell-gun/)[0];
      fireEvent.mouseEnter(gunCell);

      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();
    });

    it('should show collection name in NFT tooltip', async () => {
      render(
        <WaffleChart
          gunPercent={20}
          nftPercent={80}
          gunValueUsd={200}
          nftValueUsd={800}
          collections={[{ name: 'OTG Genesis', percentOfNfts: 100, color: '#96aaff', valueUsd: 800, count: 3 }]}
        />
      );

      const nftCell = screen.getAllByTestId(/^waffle-cell-nft/)[0];
      fireEvent.mouseEnter(nftCell);

      expect(await screen.findByText(/OTG Genesis/)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          gunValueUsd={500}
          collections={[]}
        />
      );

      const gunCell = screen.getAllByTestId(/^waffle-cell-gun/)[0];
      fireEvent.mouseEnter(gunCell);
      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();

      fireEvent.mouseLeave(gunCell);
      // Tooltip should be hidden after mouse leave
      expect(screen.queryByText(/GUN Tokens/)).not.toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('should show legend with all collections when showLegend is true', () => {
      render(
        <WaffleChart
          gunPercent={20}
          nftPercent={80}
          showLegend={true}
          collections={[
            { name: 'Genesis', percentOfNfts: 60, color: '#96aaff', valueUsd: 600, count: 3 },
            { name: 'Weapons', percentOfNfts: 40, color: '#c4b5fd', valueUsd: 400, count: 2 },
          ]}
        />
      );

      expect(screen.getByText('GUN')).toBeInTheDocument();
      expect(screen.getByText('Genesis')).toBeInTheDocument();
      expect(screen.getByText('Weapons')).toBeInTheDocument();
    });

    it('should hide legend when showLegend is false', () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          showLegend={false}
          collections={[{ name: 'Genesis', percentOfNfts: 100, color: '#96aaff', valueUsd: 500, count: 1 }]}
        />
      );

      expect(screen.queryByTestId('waffle-legend')).not.toBeInTheDocument();
    });

    it('should show "+N more" for many collections', () => {
      const manyCollections = Array.from({ length: 8 }, (_, i) => ({
        name: `Collection ${i + 1}`,
        percentOfNfts: 12.5,
        color: '#96aaff',
        valueUsd: 100,
        count: 1,
      }));

      render(
        <WaffleChart
          gunPercent={0}
          nftPercent={100}
          showLegend={true}
          collections={manyCollections}
        />
      );

      // Should show first 5 collections + "more"
      expect(screen.getByText(/\+3 more/)).toBeInTheDocument();
    });
  });
});
