/**
 * NFT Gallery Pagination
 *
 * Auto-loads next page when sentinel scrolls into view (IntersectionObserver).
 * Shows loading spinner during fetch, dev debug info, and all-loaded message.
 * RENDER ONLY: All pagination state comes from props.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { NFTGalleryPaginationProps } from './types';

export function NFTGalleryPagination({ paginationInfo, onLoadMore }: NFTGalleryPaginationProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auto-load next page when sentinel enters viewport
  useEffect(() => {
    if (!paginationInfo.hasMore || !onLoadMore || paginationInfo.isLoadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '400px' } // Trigger 400px before sentinel is visible
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [paginationInfo.hasMore, paginationInfo.isLoadingMore, onLoadMore]);

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      {/* Pagination Debug Info - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="font-mono text-xs text-[var(--gs-gray-3)] flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>
            <span className="text-[var(--gs-gray-4)]">totalOwnedCount:</span>{' '}
            <span className="text-[var(--gs-lime)]">{paginationInfo.totalOwnedCount}</span>
          </span>
          <span>
            <span className="text-[var(--gs-gray-4)]">fetchedCount:</span>{' '}
            <span className="text-[var(--gs-lime)]">{paginationInfo.fetchedCount}</span>
          </span>
          <span>
            <span className="text-[var(--gs-gray-4)]">pageSize:</span>{' '}
            <span className="text-[var(--gs-gray-4)]">{paginationInfo.pageSize}</span>
          </span>
          <span>
            <span className="text-[var(--gs-gray-4)]">pagesLoaded:</span>{' '}
            <span className="text-[var(--gs-gray-4)]">{paginationInfo.pagesLoaded}</span>
          </span>
        </div>
      )}

      {/* Auto-load sentinel + loading indicator */}
      {paginationInfo.hasMore && onLoadMore && (
        <>
          <div ref={sentinelRef} className="w-full h-1" aria-hidden="true" />
          {paginationInfo.isLoadingMore && (
            <div className="flex items-center gap-2 font-body text-sm text-[var(--gs-gray-4)]">
              <div className="w-4 h-4 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
              Loading more NFTs...
              <span className="font-mono text-xs text-[var(--gs-gray-3)]">
                ({paginationInfo.totalOwnedCount - paginationInfo.fetchedCount} remaining)
              </span>
            </div>
          )}
        </>
      )}

      {/* All Loaded Message - dev only */}
      {process.env.NODE_ENV === 'development' && !paginationInfo.hasMore && paginationInfo.totalOwnedCount > 0 && (
        <p className="font-mono text-xs text-[var(--gs-gray-3)]">
          All {paginationInfo.totalOwnedCount} NFTs loaded
        </p>
      )}
    </div>
  );
}
