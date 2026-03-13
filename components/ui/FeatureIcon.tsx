'use client';

import { ReactNode } from 'react';

interface FeatureIconProps {
  name: 'analytics' | 'chain' | 'intel' | 'weapon' | 'rarity' | 'pricing' | 'identity';
  className?: string;
}

export function FeatureIcon({ name, className = '' }: FeatureIconProps) {
  const baseClass = `w-5 h-5 ${className}`;

  const icons: Record<string, ReactNode> = {
    analytics: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 6-6" />
        <circle cx="21" cy="10" r="1" fill="currentColor" />
      </svg>
    ),
    chain: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    intel: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </svg>
    ),
    weapon: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h6l2-3h4l2 3h6" />
        <path d="M6 12v4h12v-4" />
        <path d="M12 3v6" />
        <circle cx="12" cy="3" r="1" fill="currentColor" />
      </svg>
    ),
    rarity: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    pricing: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    identity: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7.5 16.5C8.5 14 10 13 12 13s3.5 1 4.5 3.5" />
      </svg>
    ),
  };

  return icons[name] || null;
}

export default FeatureIcon;
