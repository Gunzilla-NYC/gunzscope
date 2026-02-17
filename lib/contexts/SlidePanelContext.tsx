'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type PanelId = 'wallet' | 'share' | 'wallet-switcher' | null;

interface SlidePanelContextValue {
  activePanel: PanelId;
  openPanel: (id: PanelId) => void;
  closePanel: () => void;
  togglePanel: (id: PanelId) => void;
  /** DOM node for drop-panel mounting (below PortfolioHeader) */
  panelSlotNode: HTMLDivElement | null;
  setPanelSlotNode: (node: HTMLDivElement | null) => void;
}

const SlidePanelContext = createContext<SlidePanelContextValue | null>(null);

export function SlidePanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [panelSlotNode, setPanelSlotNode] = useState<HTMLDivElement | null>(null);

  const openPanel = useCallback((id: PanelId) => setActivePanel(id), []);
  const closePanel = useCallback(() => setActivePanel(null), []);
  const togglePanel = useCallback(
    (id: PanelId) => setActivePanel((prev) => (prev === id ? null : id)),
    [],
  );

  return (
    <SlidePanelContext.Provider value={{ activePanel, openPanel, closePanel, togglePanel, panelSlotNode, setPanelSlotNode }}>
      {children}
    </SlidePanelContext.Provider>
  );
}

/** Returns null when no provider is present (non-portfolio pages). */
export function useSlidePanelContext(): SlidePanelContextValue | null {
  return useContext(SlidePanelContext);
}

/**
 * Layout wrapper for panel-aware pages. No side padding is needed since
 * all panels (wallet dropdown, drop-panels) overlay content rather than
 * pushing it aside.
 */
export function SlidePanelLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className ?? ''}>
      {children}
    </div>
  );
}
