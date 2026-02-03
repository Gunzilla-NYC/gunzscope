'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type PaletteVersion = 'v1' | 'v2';

interface PaletteContextType {
  palette: PaletteVersion;
  setPalette: (palette: PaletteVersion) => void;
  togglePalette: () => void;
  isV2: boolean;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

const STORAGE_KEY = 'gs-palette-version';

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteVersion>('v1');
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as PaletteVersion | null;
    if (stored === 'v1' || stored === 'v2') {
      setPaletteState(stored);
    }
  }, []);

  // Apply class to <html> when palette changes
  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    if (palette === 'v2') {
      html.classList.add('palette-v2');
    } else {
      html.classList.remove('palette-v2');
    }
  }, [palette, mounted]);

  const setPalette = useCallback((newPalette: PaletteVersion) => {
    setPaletteState(newPalette);
    localStorage.setItem(STORAGE_KEY, newPalette);
  }, []);

  const togglePalette = useCallback(() => {
    setPalette(palette === 'v1' ? 'v2' : 'v1');
  }, [palette, setPalette]);

  // Keyboard shortcut: Ctrl+Shift+P to toggle palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette]);

  return (
    <PaletteContext.Provider
      value={{
        palette,
        setPalette,
        togglePalette,
        isV2: palette === 'v2',
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const context = useContext(PaletteContext);
  if (context === undefined) {
    throw new Error('usePalette must be used within a PaletteProvider');
  }
  return context;
}
