import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeaponLabDrawer from '../WeaponLabDrawer';
import { NFT } from '@/lib/types';

const mockWeapon: NFT = {
  tokenId: '1',
  name: 'Vulture Legacy',
  image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
  collection: 'Off The Grid NFT Collection',
  chain: 'avalanche',
  traits: { CLASS: 'Weapon', RARITY: 'Epic' },
};

const mockAttachment: NFT = {
  tokenId: '2',
  name: 'Vulture Reflex Sight',
  image: 'https://example.com/WeaponAttachment_DA_WA_AR05_SGT_REF_02_hd.png',
  collection: 'Off The Grid NFT Collection',
  chain: 'avalanche',
  traits: { CLASS: 'Weapon Attachment', RARITY: 'Uncommon' },
};

describe('WeaponLabDrawer', () => {
  it('renders when open', () => {
    render(
      <WeaponLabDrawer
        isOpen={true}
        onClose={vi.fn()}
        weapon={mockWeapon}
        inventory={[mockAttachment]}
      />
    );

    expect(screen.getByText('Weapon Lab')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <WeaponLabDrawer
        isOpen={false}
        onClose={vi.fn()}
        weapon={mockWeapon}
        inventory={[mockAttachment]}
      />
    );

    expect(screen.queryByText('Weapon Lab')).not.toBeInTheDocument();
  });

  it('displays compatible items', () => {
    render(
      <WeaponLabDrawer
        isOpen={true}
        onClose={vi.fn()}
        weapon={mockWeapon}
        inventory={[mockAttachment]}
      />
    );

    expect(screen.getByText('Vulture Reflex Sight')).toBeInTheDocument();
    expect(screen.getByText('UNCOMMON')).toBeInTheDocument();
  });

  it('shows empty state when no compatible items', () => {
    render(
      <WeaponLabDrawer
        isOpen={true}
        onClose={vi.fn()}
        weapon={mockWeapon}
        inventory={[]}
      />
    );

    expect(screen.getByText(/No modifications found/)).toBeInTheDocument();
  });

  it('calls onClose when Exit Armory clicked', () => {
    const onClose = vi.fn();
    render(
      <WeaponLabDrawer
        isOpen={true}
        onClose={onClose}
        weapon={mockWeapon}
        inventory={[]}
      />
    );

    fireEvent.click(screen.getByText(/Exit Armory/));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Weapon Prototypes section with Experimental badge', () => {
    render(
      <WeaponLabDrawer
        isOpen={true}
        onClose={vi.fn()}
        weapon={mockWeapon}
        inventory={[]}
      />
    );

    expect(screen.getByText('WEAPON PROTOTYPES')).toBeInTheDocument();
    expect(screen.getByText('Experimental')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });
});
