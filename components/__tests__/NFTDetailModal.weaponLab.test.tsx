import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NFTDetailModal from '../NFTDetailModal';
import { NFT } from '@/lib/types';

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const createWeapon = (overrides: Partial<NFT> = {}): NFT => ({
  tokenId: '1',
  name: 'Vulture Legacy',
  image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
  collection: 'Off The Grid NFT Collection',
  chain: 'avalanche',
  traits: { CLASS: 'Weapon', RARITY: 'Epic' },
  typeSpec: { Item: { rarity: 'Elite' } },
  ...overrides,
});

const createAttachment = (): NFT => ({
  tokenId: '2',
  name: 'Vulture Reflex Sight',
  image: 'https://example.com/WeaponAttachment_DA_WA_AR05_SGT_REF_02_hd.png',
  collection: 'Off The Grid NFT Collection',
  chain: 'avalanche',
  traits: { CLASS: 'Weapon Attachment', RARITY: 'Uncommon' },
});

describe('NFTDetailModal - Weapon Lab Integration', () => {
  it('shows Open Weapon Lab button for modifiable weapons', () => {
    render(
      <NFTDetailModal
        nft={createWeapon()}
        isOpen={true}
        onClose={vi.fn()}
        allNfts={[]}
      />
    );

    // Expand details section first
    fireEvent.click(screen.getByText('View details'));

    expect(screen.getByText(/Open Weapon Lab/)).toBeInTheDocument();
  });

  it('hides Weapon Lab button for Classified weapons', () => {
    const classifiedWeapon = createWeapon({
      name: 'Vulture Solana',
      image: 'https://example.com/Weapon_Weapon_AR05_V_60A_hd.png',
      typeSpec: { Item: { rarity: 'Classified' } },
    });

    render(
      <NFTDetailModal
        nft={classifiedWeapon}
        isOpen={true}
        onClose={vi.fn()}
        allNfts={[]}
      />
    );

    // Expand details section first
    fireEvent.click(screen.getByText('View details'));

    expect(screen.queryByText(/Open Weapon Lab/)).not.toBeInTheDocument();
    expect(screen.getByText(/Classified Weapon/)).toBeInTheDocument();
  });

  it('opens Weapon Lab drawer when button clicked', () => {
    render(
      <NFTDetailModal
        nft={createWeapon()}
        isOpen={true}
        onClose={vi.fn()}
        allNfts={[createAttachment()]}
      />
    );

    // Expand details section first
    fireEvent.click(screen.getByText('View details'));

    fireEvent.click(screen.getByText(/Open Weapon Lab/));

    expect(screen.getByText('Weapon Lab')).toBeInTheDocument();
    expect(screen.getByText('Vulture Reflex Sight')).toBeInTheDocument();
  });

  it('shows TierBadge for weapons with typeSpec', () => {
    render(
      <NFTDetailModal
        nft={createWeapon()}
        isOpen={true}
        onClose={vi.fn()}
        allNfts={[]}
      />
    );

    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('does not show Weapon Lab for non-weapons', () => {
    const character: NFT = {
      tokenId: '3',
      name: 'Maya Character',
      image: 'https://example.com/character.png',
      collection: 'Off The Grid NFT Collection',
      chain: 'avalanche',
      traits: { CLASS: 'Character', RARITY: 'Epic' },
    };

    render(
      <NFTDetailModal
        nft={character}
        isOpen={true}
        onClose={vi.fn()}
        allNfts={[]}
      />
    );

    // Expand details section first
    fireEvent.click(screen.getByText('View details'));

    expect(screen.queryByText(/Open Weapon Lab/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Classified Weapon/)).not.toBeInTheDocument();
  });
});
