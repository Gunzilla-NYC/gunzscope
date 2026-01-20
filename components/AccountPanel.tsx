'use client';

import { useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useUserProfile, TrackedAddress, FavoriteItem } from '@/lib/hooks/useUserProfile';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect?: (address: string) => void;
}

type TabId = 'tracked' | 'favorites' | 'settings';

export default function AccountPanel({
  isOpen,
  onClose,
  onAddressSelect,
}: AccountPanelProps) {
  const { primaryWallet, user } = useDynamicContext();
  const isAuthenticated = !!user;
  const {
    profile,
    isLoading,
    removeTrackedAddress,
    removeFavorite,
    updateEmail,
  } = useUserProfile();

  const [activeTab, setActiveTab] = useState<TabId>('tracked');
  const [newTrackedAddress, setNewTrackedAddress] = useState('');
  const [newTrackedLabel, setNewTrackedLabel] = useState('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [email, setEmail] = useState(profile?.email || '');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const { addTrackedAddress } = useUserProfile();

  if (!isOpen) return null;

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleAddTrackedAddress = async () => {
    if (!newTrackedAddress.trim()) return;
    setIsAddingAddress(true);
    try {
      await addTrackedAddress(newTrackedAddress.trim(), newTrackedLabel.trim() || undefined);
      setNewTrackedAddress('');
      setNewTrackedLabel('');
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleRemoveTracked = async (tracked: TrackedAddress) => {
    await removeTrackedAddress(tracked.id);
  };

  const handleRemoveFavorite = async (favorite: FavoriteItem) => {
    await removeFavorite(favorite.id);
  };

  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    try {
      await updateEmail(email.trim() || null);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSelectAddress = (address: string) => {
    onAddressSelect?.(address);
    onClose();
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'tracked', label: 'Tracked', count: profile?.trackedAddresses.length },
    { id: 'favorites', label: 'Favorites', count: profile?.favorites.length },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative h-full w-full max-w-md bg-[#0d0d0d] border-l border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64ffff] to-[#96aaff] flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Account</h2>
              {isAuthenticated && primaryWallet && (
                <p className="text-xs text-gray-400">{formatAddress(primaryWallet.address)}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Not Connected State */}
        {!isAuthenticated && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Connect Wallet</h3>
              <p className="text-sm text-gray-400 mb-4">
                Connect your wallet to access your saved data across devices.
              </p>
            </div>
          </div>
        )}

        {/* Connected State */}
        {isAuthenticated && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'text-[#64ffff]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#64ffff]" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-8 h-8 border-2 border-[#64ffff] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Tracked Addresses Tab */}
                  {activeTab === 'tracked' && (
                    <div className="p-4 space-y-4">
                      {/* Add Address Form */}
                      <div className="p-4 bg-white/5 rounded-xl space-y-3">
                        <input
                          type="text"
                          value={newTrackedAddress}
                          onChange={(e) => setNewTrackedAddress(e.target.value)}
                          placeholder="Enter wallet address"
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#64ffff]/50"
                        />
                        <input
                          type="text"
                          value={newTrackedLabel}
                          onChange={(e) => setNewTrackedLabel(e.target.value)}
                          placeholder="Label (optional)"
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#64ffff]/50"
                        />
                        <button
                          onClick={handleAddTrackedAddress}
                          disabled={!newTrackedAddress.trim() || isAddingAddress}
                          className="w-full py-2 bg-[#64ffff]/20 text-[#64ffff] font-medium rounded-lg hover:bg-[#64ffff]/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isAddingAddress ? (
                            <div className="w-4 h-4 border-2 border-[#64ffff] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Track Address
                            </>
                          )}
                        </button>
                      </div>

                      {/* Tracked List */}
                      {profile?.trackedAddresses.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500">No tracked addresses yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profile?.trackedAddresses.map((tracked) => (
                            <div
                              key={tracked.id}
                              className="p-3 bg-white/5 rounded-lg flex items-center justify-between group hover:bg-white/10 transition"
                            >
                              <button
                                onClick={() => handleSelectAddress(tracked.address)}
                                className="flex-1 text-left"
                              >
                                <p className="text-sm font-medium text-white">
                                  {tracked.label || formatAddress(tracked.address)}
                                </p>
                                {tracked.label && (
                                  <p className="text-xs text-gray-500">{formatAddress(tracked.address)}</p>
                                )}
                              </button>
                              <button
                                onClick={() => handleRemoveTracked(tracked)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Favorites Tab */}
                  {activeTab === 'favorites' && (
                    <div className="p-4">
                      {profile?.favorites.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500">No favorites yet</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Click the heart icon on items to save them here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profile?.favorites.map((favorite) => (
                            <div
                              key={favorite.id}
                              className="p-3 bg-white/5 rounded-lg flex items-center justify-between group hover:bg-white/10 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                  {favorite.type === 'nft' && (
                                    <svg className="w-4 h-4 text-[#64ffff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  {favorite.type === 'weapon' && (
                                    <svg className="w-4 h-4 text-[#ff6b6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  )}
                                  {(favorite.type === 'skin' || favorite.type === 'attachment') && (
                                    <svg className="w-4 h-4 text-[#96aaff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                  )}
                                  {favorite.type === 'collection' && (
                                    <svg className="w-4 h-4 text-[#beffd2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {(favorite.metadata as { name?: string })?.name || favorite.refId}
                                  </p>
                                  <p className="text-xs text-gray-500 capitalize">{favorite.type}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFavorite(favorite)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Settings Tab */}
                  {activeTab === 'settings' && (
                    <div className="p-4 space-y-6">
                      {/* Email Setting */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email (Optional)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Add your email for future notifications (no spam, we promise)
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#64ffff]/50"
                          />
                          <button
                            onClick={handleSaveEmail}
                            disabled={isSavingEmail}
                            className="px-4 py-2 bg-[#64ffff]/20 text-[#64ffff] font-medium rounded-lg hover:bg-[#64ffff]/30 transition disabled:opacity-50"
                          >
                            {isSavingEmail ? (
                              <div className="w-4 h-4 border-2 border-[#64ffff] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Connected Wallets */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Connected Wallets
                        </label>
                        <div className="space-y-2">
                          {profile?.wallets.map((wallet) => (
                            <div
                              key={wallet.id}
                              className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#64ffff]/20 to-[#96aaff]/20 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-[#64ffff]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {formatAddress(wallet.address)}
                                  </p>
                                  <p className="text-xs text-gray-500 capitalize">
                                    {wallet.chain} {wallet.isPrimary && '(Primary)'}
                                  </p>
                                </div>
                              </div>
                              {wallet.isPrimary && (
                                <span className="px-2 py-0.5 text-xs bg-[#64ffff]/20 text-[#64ffff] rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Account Info */}
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-500">
                          Account created:{' '}
                          {profile?.createdAt
                            ? new Date(profile.createdAt).toLocaleDateString()
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
