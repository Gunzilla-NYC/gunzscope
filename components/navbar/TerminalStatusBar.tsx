import { useEffect } from 'react';
import { truncateAddress } from './utils';

interface TerminalStatusBarProps {
  walletAddress: string;
  onDisconnect: () => void;
}

export function TerminalStatusBar({ walletAddress, onDisconnect }: TerminalStatusBarProps) {
  const truncated = truncateAddress(walletAddress);

  // Reserve space at bottom of page so content isn't hidden behind the bar
  useEffect(() => {
    document.body.style.paddingBottom = '2rem';
    return () => { document.body.style.paddingBottom = ''; };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--gs-dark-1)]/95 backdrop-blur-sm border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] shadow-[0_0_6px_var(--gs-lime)]" />
            <span className="text-[var(--gs-lime)]">Connected</span>
          </div>
          <span className="text-[var(--gs-gray-3)]">{truncated}</span>
          <span className="text-[var(--gs-gray-2)] hidden sm:inline">&middot; GunzChain</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-[var(--gs-gray-3)] hover:text-[#FF4444] transition-colors cursor-pointer"
        >
          [ Disconnect ]
        </button>
      </div>
    </div>
  );
}
