'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface ConnectPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'save' | 'track' | 'favorite';
}

export default function ConnectPromptModal({
  isOpen,
  onClose,
  action,
}: ConnectPromptModalProps) {
  const { setShowAuthFlow } = useDynamicContext();

  if (!isOpen) return null;

  const actionText = {
    save: 'save items',
    track: 'track addresses',
    favorite: 'add favorites',
  }[action];

  const handleConnect = () => {
    onClose();
    setShowAuthFlow(true);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Modal */}
      <div
        className="relative bg-[#1a1a1a] border border-[#64ffff]/30 rounded-xl shadow-2xl shadow-black/50 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#64ffff]/20 to-[#96aaff]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#64ffff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
          </div>

          <p className="text-center text-gray-300 mb-6">
            Connect your wallet to {actionText} and sync them across devices and sessions.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleConnect}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#64ffff] to-[#96aaff] text-black font-semibold rounded-lg hover:opacity-90 transition-all hover:shadow-lg hover:shadow-[#64ffff]/20 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Connect Wallet
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-white/5 text-gray-300 font-medium rounded-lg hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your data is stored securely and linked to your wallet address.
          </p>
        </div>
      </div>
    </div>
  );
}
