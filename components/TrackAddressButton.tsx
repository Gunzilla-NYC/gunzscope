'use client';

import { useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import ConnectPromptModal from './ConnectPromptModal';

interface TrackAddressButtonProps {
  address: string;
  chain?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'icon' | 'button';
  className?: string;
}

export default function TrackAddressButton({
  address,
  chain,
  label,
  size = 'md',
  showLabel = false,
  variant = 'icon',
  className = '',
}: TrackAddressButtonProps) {
  const { user } = useDynamicContext();
  const isAuthenticated = !!user;
  const { profile, addTrackedAddress, removeTrackedAddress } = useUserProfile();

  const [isLoading, setIsLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Check if address is already tracked
  const trackedEntry = profile?.trackedAddresses.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
  const isTracked = !!trackedEntry;

  const handleClick = useCallback(async () => {
    // If not connected, show connect prompt
    if (!isAuthenticated) {
      setShowConnectModal(true);
      return;
    }

    setIsLoading(true);
    try {
      if (isTracked && trackedEntry) {
        await removeTrackedAddress(trackedEntry.id);
      } else {
        await addTrackedAddress(address, label, chain);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isTracked, trackedEntry, address, label, chain, addTrackedAddress, removeTrackedAddress]);

  const sizeClasses = {
    sm: variant === 'button' ? 'px-3 py-1.5 text-xs' : 'p-1.5',
    md: variant === 'button' ? 'px-4 py-2 text-sm' : 'p-2',
    lg: variant === 'button' ? 'px-5 py-2.5 text-base' : 'p-2.5',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`
            ${sizeClasses}
            ${isTracked
              ? 'bg-[#64ffff]/20 text-[#64ffff] border border-[#64ffff]/30'
              : 'bg-white/5 text-gray-300 border border-white/10 hover:border-[#64ffff]/30 hover:text-[#64ffff]'
            }
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
            rounded-lg transition-all flex items-center gap-2 font-medium
            ${className}
          `}
        >
          {isTracked ? (
            <>
              <svg className={iconSizes} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Tracked</span>
            </>
          ) : (
            <>
              <svg className={iconSizes} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Track</span>
            </>
          )}
        </button>

        <ConnectPromptModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          action="track"
        />
      </>
    );
  }

  // Icon variant
  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          ${sizeClasses}
          ${isTracked ? 'text-[#64ffff]' : 'text-gray-400 hover:text-[#64ffff]'}
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
          hover:bg-white/10 rounded-lg transition-all flex items-center gap-2
          ${className}
        `}
        title={isTracked ? 'Stop tracking' : 'Track this address'}
      >
        {isTracked ? (
          <svg className={iconSizes} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className={iconSizes} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {isTracked ? 'Tracked' : 'Track'}
          </span>
        )}
      </button>

      <ConnectPromptModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        action="track"
      />
    </>
  );
}
