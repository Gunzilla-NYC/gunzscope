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
        />
      );

      const gunCells = screen.getAllByTestId(/^waffle-cell-gun/);
      expect(gunCells).toHaveLength(30);
    });

    it('should fill correct number of cells for NFTs', () => {
      render(
        <WaffleChart
          gunPercent={30}
          nftPercent={70}
        />
      );

      const nftCells = screen.getAllByTestId(/^waffle-cell-nft/);
      expect(nftCells).toHaveLength(70);
    });

    it('should show empty cells when total < 100%', () => {
      render(
        <WaffleChart
          gunPercent={40}
          nftPercent={30}
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
          size={200}
        />
      );

      const grid = container.querySelector('[data-testid="waffle-grid"]');
      expect(grid).toHaveStyle({ width: '200px', height: '200px' });
    });
  });

  describe('edge cases', () => {
    it('should handle 100% GUN', () => {
      render(<WaffleChart gunPercent={100} nftPercent={0} />);
      const gunCells = screen.getAllByTestId(/^waffle-cell-gun/);
      expect(gunCells).toHaveLength(100);
    });

    it('should handle 100% NFTs', () => {
      render(<WaffleChart gunPercent={0} nftPercent={100} />);
      const nftCells = screen.getAllByTestId(/^waffle-cell-nft/);
      expect(nftCells).toHaveLength(100);
    });

    it('should handle empty portfolio', () => {
      render(<WaffleChart gunPercent={0} nftPercent={0} />);
      const emptyCells = screen.getAllByTestId(/^waffle-cell-empty/);
      expect(emptyCells).toHaveLength(100);
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
        />
      );

      const gunCell = screen.getAllByTestId(/^waffle-cell-gun/)[0];
      fireEvent.mouseEnter(gunCell);

      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();
    });

    it('should show NFT Holdings in NFT tooltip', async () => {
      render(
        <WaffleChart
          gunPercent={20}
          nftPercent={80}
          gunValueUsd={200}
          nftValueUsd={800}
          nftCount={5}
        />
      );

      const nftCell = screen.getAllByTestId(/^waffle-cell-nft/)[0];
      fireEvent.mouseEnter(nftCell);

      expect(await screen.findByText(/NFT Holdings/)).toBeInTheDocument();
      expect(await screen.findByText(/5 items/)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          gunValueUsd={500}
        />
      );

      const gunCell = screen.getAllByTestId(/^waffle-cell-gun/)[0];
      fireEvent.mouseEnter(gunCell);
      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();

      fireEvent.mouseLeave(gunCell);
      expect(screen.queryByText(/GUN Tokens/)).not.toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('should show legend with GUN and NFTs when showLegend is true', () => {
      render(
        <WaffleChart
          gunPercent={40}
          nftPercent={60}
          showLegend={true}
        />
      );

      expect(screen.getByText('GUN')).toBeInTheDocument();
      expect(screen.getByText('NFTs')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should hide legend when showLegend is false', () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          showLegend={false}
        />
      );

      expect(screen.queryByTestId('waffle-legend')).not.toBeInTheDocument();
    });

    it('should only show GUN in legend when no NFTs', () => {
      render(
        <WaffleChart
          gunPercent={100}
          nftPercent={0}
          showLegend={true}
        />
      );

      expect(screen.getByText('GUN')).toBeInTheDocument();
      expect(screen.queryByText('NFTs')).not.toBeInTheDocument();
    });

    it('should only show NFTs in legend when no GUN', () => {
      render(
        <WaffleChart
          gunPercent={0}
          nftPercent={100}
          showLegend={true}
        />
      );

      expect(screen.queryByText('GUN')).not.toBeInTheDocument();
      expect(screen.getByText('NFTs')).toBeInTheDocument();
    });
  });
});
