'use client';

import { useState, useRef, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface WalletButtonProps {
  onWalletConnect?: (address: string) => void;
  onWalletDisconnect?: () => void;
}

export default function WalletButton({
  onWalletConnect,
  onWalletDisconnect,
}: WalletButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { primaryWallet, setShowAuthFlow, handleLogOut } = useDynamicContext();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent when wallet connects
  useEffect(() => {
    if (primaryWallet?.address && onWalletConnect) {
      onWalletConnect(primaryWallet.address);
    }
  }, [primaryWallet?.address, onWalletConnect]);

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle connect button click
  const handleConnect = () => {
    setShowAuthFlow(true);
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    setIsDropdownOpen(false);
    await handleLogOut();
    onWalletDisconnect?.();
  };

  // Not connected state
  if (!primaryWallet) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#64ffff] to-[#96aaff] text-black font-semibold text-sm rounded-lg hover:opacity-90 transition-all hover:shadow-lg hover:shadow-[#64ffff]/20"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </button>
    );
  }

  const walletAddress = primaryWallet.address;
  const connectorName = primaryWallet.connector?.name || 'Wallet';

  // Connected state
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#64ffff]/30 rounded-lg hover:border-[#64ffff]/50 transition-all group"
      >
        {/* Address/Name */}
        <span className="text-sm font-medium text-white">
          {formatAddress(walletAddress)}
        </span>

        {/* Avatar */}
        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-[#64ffff] to-[#96aaff] flex items-center justify-center">
          <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#beffd2] rounded-full border-2 border-[#1a1a1a]" />
        </div>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50 ${
          isDropdownOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{
          transition: 'opacity 200ms ease-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Wallet Info Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#64ffff] to-[#96aaff] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {connectorName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {formatAddress(walletAddress)}
              </p>
            </div>
            {/* Copy button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(walletAddress);
              }}
              className="p-1.5 text-gray-400 hover:text-[#64ffff] hover:bg-white/5 rounded transition"
              title="Copy address"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <a
            href={`https://gunzscan.io/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
            onClick={() => setIsDropdownOpen(false)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>View on Explorer</span>
          </a>

          <div className="my-2 border-t border-white/10" />

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
}
