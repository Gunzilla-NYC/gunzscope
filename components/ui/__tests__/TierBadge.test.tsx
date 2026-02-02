import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TierBadge from '../TierBadge';

describe('TierBadge', () => {
  it('renders Standard tier with neutral styling', () => {
    render(<TierBadge tier="Standard" />);
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('renders Classified tier with lock icon', () => {
    render(<TierBadge tier="Classified" />);
    const badge = screen.getByText(/Classified/);
    expect(badge).toBeInTheDocument();
    // Should have lock icon
    expect(badge.closest('span')?.innerHTML).toContain('svg');
  });

  it('renders Unknown tier gracefully', () => {
    render(<TierBadge tier="Unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TierBadge tier="Elite" className="custom-class" />);
    // The className is applied to the outer wrapper span (parent of the badge span)
    const innerBadge = screen.getByText('Elite').closest('span');
    const outerWrapper = innerBadge?.parentElement;
    expect(outerWrapper).toHaveClass('custom-class');
  });

  it('shows tooltip on hover', async () => {
    render(<TierBadge tier="Classified" showTooltip />);
    // Tooltip content should be present (may be hidden initially)
    expect(screen.getByText(/Special edition/)).toBeInTheDocument();
  });

  it('hides tooltip when showTooltip is false', () => {
    render(<TierBadge tier="Classified" showTooltip={false} />);
    expect(screen.queryByText(/Special edition/)).not.toBeInTheDocument();
  });
});
