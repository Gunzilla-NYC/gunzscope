'use client';

import { useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useUserProfile, FavoriteItem } from '@/lib/hooks/useUserProfile';
import ConnectPromptModal from './ConnectPromptModal';

interface FavoriteButtonProps {
  type: FavoriteItem['type'];
  refId: string;
  metadata?: Record<string, unknown>;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function FavoriteButton({
  type,
  refId,
  metadata,
  size = 'md',
  showLabel = false,
  className = '',
}: FavoriteButtonProps) {
  const { user } = useDynamicContext();
  const isAuthenticated = !!user;
  const { profile, isFavorited, addFavorite, removeFavorite } = useUserProfile();

  const [isLoading, setIsLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  // Optimistic state: immediately reflect the toggle before API responds
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const favorited = optimistic ?? isFavorited(type, refId);

  // Find the favorite ID if it exists
  const favoriteId = profile?.favorites.find(
    (f) => f.type === type && f.refId === refId
  )?.id;

  const handleClick = useCallback(async () => {
    // If not connected, show connect prompt
    if (!isAuthenticated) {
      setShowConnectModal(true);
      return;
    }

    // Optimistic toggle — instant visual feedback
    const willFavorite = !favorited;
    setOptimistic(willFavorite);
    setIsLoading(true);

    try {
      if (!willFavorite && favoriteId) {
        await removeFavorite(favoriteId);
      } else {
        await addFavorite(type, refId, metadata);
      }
    } catch {
      // Revert optimistic state on failure
      setOptimistic(null);
    } finally {
      setIsLoading(false);
      // Clear optimistic override — real state from profile takes over
      setOptimistic(null);
    }
  }, [isAuthenticated, favorited, favoriteId, type, refId, metadata, addFavorite, removeFavorite]);

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          ${sizeClasses}
          ${favorited ? 'text-[#ff6b6b]' : 'text-gray-400 hover:text-[#ff6b6b]'}
          ${isLoading ? 'opacity-70 cursor-wait' : ''}
          hover:bg-white/10 rounded-lg transition-all flex items-center gap-2
          ${className}
        `}
        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {favorited ? (
          <svg
            className={`${iconSizes} ${isLoading ? 'animate-[heartPop_0.3s_ease-out]' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg
            className={iconSizes}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {favorited ? 'Favorited' : 'Favorite'}
          </span>
        )}
      </button>

      <ConnectPromptModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        action="favorite"
      />
    </>
  );
}
