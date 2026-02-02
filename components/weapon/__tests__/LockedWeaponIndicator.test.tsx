import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LockedWeaponIndicator from '../LockedWeaponIndicator';

describe('LockedWeaponIndicator', () => {
  it('renders with lock icon and title', () => {
    render(<LockedWeaponIndicator />);

    expect(screen.getByText('Classified Weapon')).toBeInTheDocument();
    expect(screen.getByText(/cannot be modified/)).toBeInTheDocument();
  });

  it('includes lock icon SVG', () => {
    const { container } = render(<LockedWeaponIndicator />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
