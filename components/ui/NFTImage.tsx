'use client';

import { useState, memo } from 'react';
import Image from 'next/image';

interface NFTImageProps {
  src: string | undefined | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  fallbackInitials?: string;
  fallbackClassName?: string;
}

/**
 * NFT image with graceful 404 fallback.
 * Shows initials or a broken-image icon when the upstream CDN returns 404.
 */
export const NFTImage = memo(function NFTImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  fallbackInitials,
  fallbackClassName = 'font-display text-lg font-bold text-[var(--gs-gray-1)]',
}: NFTImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {fallbackInitials ? (
          <span className={fallbackClassName}>{fallbackInitials}</span>
        ) : (
          <svg className="w-6 h-6 text-[var(--gs-gray-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
});
