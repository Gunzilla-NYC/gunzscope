'use client';

import { useRef, useState } from 'react';
import { useClickOutside } from '@/components/navbar/hooks/useClickOutside';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onSelect: (itemName: string) => void;
}

export function SearchAutocomplete({ value, onChange, suggestions, onSelect }: SearchAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setShowSuggestions(false), showSuggestions);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gs-gray-2)] pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          aria-label="Search items by name"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search weapons, skins, items\u2026"
          className="w-full pl-10 pr-8 py-2.5 bg-[var(--gs-dark-3)] border border-white/[0.08] text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm"
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              setShowSuggestions(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-[var(--gs-dark-2)] border border-white/[0.08] shadow-lg max-h-64 overflow-auto clip-corner-sm">
          {suggestions.map((name) => (
            <button
              key={name}
              onClick={() => {
                onSelect(name);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-3 py-2 font-mono text-sm text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-[var(--gs-lime)]/[0.05] transition-colors cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
