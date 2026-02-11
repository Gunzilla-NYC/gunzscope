import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WaffleChart from '../WaffleChart';

describe('WaffleChart (Composition Heatmap)', () => {
  describe('block rendering', () => {
    it('should render GUN and NFT cells', () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 50, nftPercent: 50 }}
        />
      );

      const gunCells = screen.getAllByTestId('waffle-cell-gun');
      const nftCells = screen.getAllByTestId('waffle-cell-nft');

      expect(gunCells.length).toBe(50);
      expect(nftCells.length).toBe(50);
    });

    it('should render only GUN cells when 100% GUN', () => {
      render(<WaffleChart composition={{ gunPercent: 100, nftPercent: 0 }} />);

      const gunCells = screen.getAllByTestId('waffle-cell-gun');
      expect(gunCells.length).toBe(100);
      expect(screen.queryByTestId('waffle-cell-nft')).not.toBeInTheDocument();
    });

    it('should render only NFT cells when 100% NFTs', () => {
      render(<WaffleChart composition={{ gunPercent: 0, nftPercent: 100 }} />);

      const nftCells = screen.getAllByTestId('waffle-cell-nft');
      expect(nftCells.length).toBe(100);
      expect(screen.queryByTestId('waffle-cell-gun')).not.toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(<WaffleChart composition={{ gunPercent: 0, nftPercent: 0 }} />);

      expect(screen.getByTestId('waffle-cell-empty')).toBeInTheDocument();
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('should render with custom size', () => {
      const { container } = render(
        <WaffleChart
          composition={{ gunPercent: 50, nftPercent: 50 }}
          display={{ size: 200 }}
        />
      );

      const grid = container.querySelector('[data-testid="waffle-grid"]');
      expect(grid).toHaveStyle({ width: '200px', height: '200px' });
    });

    it('should allocate cells accurately for small percentages', () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 99, nftPercent: 1 }}
        />
      );

      const gunCells = screen.getAllByTestId('waffle-cell-gun');
      const nftCells = screen.getAllByTestId('waffle-cell-nft');

      expect(gunCells.length).toBe(99);
      expect(nftCells.length).toBe(1);
    });
  });

  describe('tooltips', () => {
    it('should show tooltip on GUN cell hover', async () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 50, nftPercent: 50 }}
          values={{ gunValueUsd: 1000, nftValueUsd: 1000 }}
        />
      );

      const gunCells = screen.getAllByTestId('waffle-cell-gun');
      fireEvent.mouseEnter(gunCells[0]);

      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();
    });

    it('should show NFT Holdings in NFT tooltip', async () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 20, nftPercent: 80, nftCount: 5 }}
          values={{ gunValueUsd: 200, nftValueUsd: 800 }}
        />
      );

      const nftCells = screen.getAllByTestId('waffle-cell-nft');
      fireEvent.mouseEnter(nftCells[0]);

      expect(await screen.findByText(/NFT Holdings/)).toBeInTheDocument();
      expect(await screen.findByText(/5 items/)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 50, nftPercent: 50 }}
          values={{ gunValueUsd: 500, nftValueUsd: 0 }}
        />
      );

      const gunCells = screen.getAllByTestId('waffle-cell-gun');
      fireEvent.mouseEnter(gunCells[0]);
      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();

      fireEvent.mouseLeave(gunCells[0]);
      expect(screen.queryByText(/GUN Tokens/)).not.toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('should show legend with GUN and NFTs when showLegend is true', () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 40, nftPercent: 60 }}
          display={{ showLegend: true }}
        />
      );

      expect(screen.getByText('GUN')).toBeInTheDocument();
      expect(screen.getByText('NFTs')).toBeInTheDocument();
    });

    it('should hide legend when showLegend is false', () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 50, nftPercent: 50 }}
          display={{ showLegend: false }}
        />
      );

      expect(screen.queryByTestId('waffle-legend')).not.toBeInTheDocument();
    });

    it('should only show GUN in legend when no NFTs', () => {
      render(
        <WaffleChart
          composition={{ gunPercent: 100, nftPercent: 0 }}
          display={{ showLegend: true }}
        />
      );

      expect(screen.getByText('GUN')).toBeInTheDocument();
      expect(screen.queryByText('NFTs')).not.toBeInTheDocument();
    });
  });
});
