'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type PanelId = 'wallet' | 'share' | null;

interface SlidePanelContextValue {
  activePanel: PanelId;
  openPanel: (id: PanelId) => void;
  closePanel: () => void;
  togglePanel: (id: PanelId) => void;
}

const SlidePanelContext = createContext<SlidePanelContextValue | null>(null);

export function SlidePanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);

  const openPanel = useCallback((id: PanelId) => setActivePanel(id), []);
  const closePanel = useCallback(() => setActivePanel(null), []);
  const togglePanel = useCallback(
    (id: PanelId) => setActivePanel((prev) => (prev === id ? null : id)),
    [],
  );

  return (
    <SlidePanelContext.Provider value={{ activePanel, openPanel, closePanel, togglePanel }}>
      {children}
    </SlidePanelContext.Provider>
  );
}

/** Returns null when no provider is present (non-portfolio pages). */
export function useSlidePanelContext(): SlidePanelContextValue | null {
  return useContext(SlidePanelContext);
}
