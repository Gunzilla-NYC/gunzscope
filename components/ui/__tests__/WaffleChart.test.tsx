import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WaffleChart from '../WaffleChart';

describe('WaffleChart (Composition Heatmap)', () => {
  describe('block rendering', () => {
    it('should render GUN and NFT blocks', () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
        />
      );

      expect(screen.getByTestId('waffle-cell-gun')).toBeInTheDocument();
      expect(screen.getByTestId('waffle-cell-nft')).toBeInTheDocument();
    });

    it('should render only GUN block when 100% GUN', () => {
      render(<WaffleChart gunPercent={100} nftPercent={0} />);

      expect(screen.getByTestId('waffle-cell-gun')).toBeInTheDocument();
      expect(screen.queryByTestId('waffle-cell-nft')).not.toBeInTheDocument();
    });

    it('should render only NFT block when 100% NFTs', () => {
      render(<WaffleChart gunPercent={0} nftPercent={100} />);

      expect(screen.queryByTestId('waffle-cell-gun')).not.toBeInTheDocument();
      expect(screen.getByTestId('waffle-cell-nft')).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(<WaffleChart gunPercent={0} nftPercent={0} />);

      expect(screen.getByTestId('waffle-cell-empty')).toBeInTheDocument();
      expect(screen.getByText('No data')).toBeInTheDocument();
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

    it('should show percentage labels when blocks are large enough', () => {
      render(
        <WaffleChart
          gunPercent={60}
          nftPercent={40}
        />
      );

      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  describe('tooltips', () => {
    it('should show tooltip on GUN block hover', async () => {
      render(
        <WaffleChart
          gunPercent={50}
          nftPercent={50}
          gunValueUsd={1000}
          nftValueUsd={1000}
        />
      );

      const gunBlock = screen.getByTestId('waffle-cell-gun');
      fireEvent.mouseEnter(gunBlock);

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

      const nftBlock = screen.getByTestId('waffle-cell-nft');
      fireEvent.mouseEnter(nftBlock);

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

      const gunBlock = screen.getByTestId('waffle-cell-gun');
      fireEvent.mouseEnter(gunBlock);
      expect(await screen.findByText(/GUN Tokens/)).toBeInTheDocument();

      fireEvent.mouseLeave(gunBlock);
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
  });
});
