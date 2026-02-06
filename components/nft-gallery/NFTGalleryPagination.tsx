/**
 * NFT Gallery Pagination
 *
 * Load more button, dev debug info, and all-loaded message.
 * RENDER ONLY: All pagination state comes from props.
 */

'use client';

import type { NFTGalleryPaginationProps } from './types';

export function NFTGalleryPagination({ paginationInfo, onLoadMore }: NFTGalleryPaginationProps) {
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

      {/* Load More Button */}
      {paginationInfo.hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={paginationInfo.isLoadingMore}
          className="font-body px-6 py-3 bg-gradient-to-r from-[var(--gs-lime)]/20 to-[var(--gs-purple)]/20 text-[var(--gs-lime)] font-medium rounded-lg border border-[var(--gs-lime)]/30 hover:border-[var(--gs-lime)]/60 hover:from-[var(--gs-lime)]/30 hover:to-[var(--gs-purple)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {paginationInfo.isLoadingMore ? (
            <>
              <div className="w-4 h-4 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin"></div>
              Loading...
            </>
          ) : (
            <>
              Load More NFTs
              <span className="font-mono text-xs text-[var(--gs-lime)]/70">
                ({paginationInfo.totalOwnedCount - paginationInfo.fetchedCount} remaining)
              </span>
            </>
          )}
        </button>
      )}

      {/* All Loaded Message */}
      {!paginationInfo.hasMore && paginationInfo.totalOwnedCount > 0 && (
        <p className="font-mono text-xs text-[var(--gs-gray-3)]">
          All {paginationInfo.totalOwnedCount} NFTs loaded
        </p>
      )}
    </div>
  );
}
