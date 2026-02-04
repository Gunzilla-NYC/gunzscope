'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Logo from './Logo';
import WalletButton from './WalletButton';
import WalletSearchDropdown from './WalletSearchDropdown';
import { useUserProfile } from '@/lib/hooks/useUserProfile';

interface NavbarProps {
  onWalletConnect?: (address: string) => void;
  onWalletDisconnect?: () => void;
  onAccountClick?: () => void;
}

export default function Navbar({ onWalletConnect, onWalletDisconnect, onAccountClick }: NavbarProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);

  const {
    profile,
    addTrackedAddress,
    addPortfolioAddress,
    isInPortfolio,
  } = useUserProfile();

  // Check if address is in watchlist
  const isInWatchlist = profile?.trackedAddresses.some(
    t => t.address.toLowerCase() === searchValue.toLowerCase()
  ) ?? false;

  // Check if address is in portfolio
  const addressInPortfolio = isInPortfolio(searchValue);

  // Handlers
  const handleNavigate = (address: string) => {
    router.push(`/portfolio?address=${address}`);
    setSearchValue(''); // Clear search after navigation
  };

  const handleAddToWatchlist = async (address: string) => {
    setIsAddingWatchlist(true);
    try {
      const result = await addTrackedAddress(address);
      if (result) {
        toast.success('Added to watchlist');
        return true;
      } else {
        toast.error('Failed to add to watchlist');
        return false;
      }
    } catch {
      toast.error('Failed to add to watchlist');
      return false;
    } finally {
      setIsAddingWatchlist(false);
    }
  };

  const handleAddToPortfolio = async (address: string) => {
    setIsAddingPortfolio(true);
    try {
      const result = await addPortfolioAddress(address);
      if (result) {
        toast.success('Added to portfolio');
        return true;
      } else {
        toast.error('Failed to add to portfolio');
        return false;
      }
    } catch {
      toast.error('Failed to add to portfolio');
      return false;
    } finally {
      setIsAddingPortfolio(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-black/90 backdrop-blur-xl shadow-lg shadow-black/20'
            : 'bg-black/50 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative transition-transform duration-300 group-hover:scale-105">
                <Logo size="md" variant="full" />
                <div className="absolute inset-0 bg-[var(--gs-lime)]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-[var(--gs-purple)]/20 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30">
                Alpha
              </span>
            </Link>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md mx-4">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search wallet address..."
                className="w-full px-4 py-2 bg-[var(--gs-dark-2)] border border-white/[0.1] rounded-lg text-sm font-mono placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
              />
              <WalletSearchDropdown
                searchValue={searchValue}
                onNavigate={handleNavigate}
                onAddToWatchlist={handleAddToWatchlist}
                onAddToPortfolio={handleAddToPortfolio}
                isInWatchlist={isInWatchlist}
                isInPortfolio={addressInPortfolio}
                isAddingWatchlist={isAddingWatchlist}
                isAddingPortfolio={isAddingPortfolio}
              />
            </div>

            {/* Wallet Button */}
            <WalletButton
              onWalletConnect={onWalletConnect}
              onWalletDisconnect={onWalletDisconnect}
              onAccountClick={onAccountClick}
            />
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
