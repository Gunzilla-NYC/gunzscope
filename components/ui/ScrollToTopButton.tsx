'use client';

import { useState, useEffect } from 'react';

interface ScrollToTopButtonProps {
  /** Scroll threshold in pixels before button appears */
  threshold?: number;
}

export default function ScrollToTopButton({ threshold = 400 }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`
        fixed bottom-16 right-6 z-40
        w-12 h-12 rounded-full
        bg-[var(--gs-dark-2)] border border-white/[0.1]
        text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:border-[var(--gs-lime)]/30
        shadow-lg shadow-black/30
        flex items-center justify-center
        transition-all duration-200
        hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40
        focus:outline-none focus:ring-2 focus:ring-[var(--gs-lime)]/50
      `}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
