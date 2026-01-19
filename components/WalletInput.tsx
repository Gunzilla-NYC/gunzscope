'use client';

import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

interface WalletInputProps {
  onSubmit: (address: string, chain: 'avalanche' | 'solana') => void;
  loading?: boolean;
}

type AddressType = 'gunzchain' | 'solana' | null;

export default function WalletInput({ onSubmit, loading = false }: WalletInputProps) {
  const [address, setAddress] = useState('');
  const [detectedChain, setDetectedChain] = useState<AddressType>(null);

  const { primaryWallet } = useDynamicContext();

  // Auto-submit when wallet is connected
  useEffect(() => {
    if (primaryWallet?.address) {
      const walletAddress = primaryWallet.address;
      setAddress(walletAddress);

      // Detect chain type
      const detected = detectAddressType(walletAddress);
      setDetectedChain(detected);

      // Auto-submit with detected chain
      const chainType = detected === 'solana' ? 'solana' : 'avalanche';
      onSubmit(walletAddress, chainType);
    }
  }, [primaryWallet]);

  const detectAddressType = (addr: string): AddressType => {
    const trimmed = addr.trim();

    // EVM address: starts with 0x and is 42 characters
    // This format works for GunzChain (and other EVM chains use same format)
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return 'gunzchain';
    }

    // Solana address: Base58 encoded, typically 32-44 characters, no 0x prefix
    // Solana uses Base58 alphabet (no 0, O, I, l)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
      return 'solana';
    }

    return null;
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    const detected = detectAddressType(value);
    setDetectedChain(detected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAddress = address.trim();
    if (trimmedAddress) {
      const detected = detectAddressType(trimmedAddress);
      // Map gunzchain to avalanche for the API call
      const chainType = detected === 'solana' ? 'solana' : 'avalanche';
      onSubmit(trimmedAddress, chainType);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Connect Your Wallet
      </h2>

      {/* Dynamic Wallet Connection */}
      <div className="mb-6">
        <DynamicWidget />
      </div>

      {primaryWallet && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Connected Wallet</p>
              <p className="text-sm font-mono text-gray-900 break-all">{primaryWallet.address}</p>
              <p className="text-xs text-gray-500 mt-1">{primaryWallet.connector?.name}</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected
            </span>
          </div>
        </div>
      )}

      <div className="relative flex items-center my-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Address
          </label>
          <input
            id="wallet"
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Enter any wallet address (auto-detected)"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
            disabled={loading}
          />
          {address && (
            <div className="mt-2">
              {detectedChain === 'gunzchain' && (
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    GunzChain Address
                  </span>
                  <p className="text-xs text-green-700">
                    Showing GunzChain balance. GUN earned in-game stays in-game unless converted to NFTs.
                  </p>
                </div>
              )}
              {detectedChain === 'solana' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Solana Address
                </span>
              )}
              {!detectedChain && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Invalid address format
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Check Holdings'}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <div className="p-4 bg-blue-50 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2">What you'll see:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• GUN token balance on GunzChain & Solana</li>
            <li>• NFT holdings across both chains</li>
            <li>• Current GUN token price & USD value</li>
            <li>• NFT floor prices from OpenSea</li>
            <li>• In-game marketplace data</li>
            <li>• Total portfolio value</li>
          </ul>
        </div>

        <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-md border border-green-200">
          <h3 className="font-semibold text-gray-900 mb-3">⚠️ Important: GUN Token Rules</h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></span>
              <div>
                <strong className="text-green-900">GunzChain (Green Badge):</strong>
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">In-Game GUN:</span> Earned from playing - locked in-game. Can only buy NFTs in marketplace, then transfer NFTs out.
                </p>
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">Exchange GUN:</span> Bought from exchanges - can be sent INTO the game, but once deposited it cannot be withdrawn.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mt-1 flex-shrink-0"></span>
              <div>
                <strong className="text-purple-900">Solana (Purple Badge):</strong>
                <p className="text-gray-700">SPL Token format on Solana blockchain.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-3 italic bg-white/50 p-2 rounded">
            💡 Paste any 0x... or Solana address - we'll automatically detect which blockchain to query!
          </p>
        </div>
      </div>
    </div>
  );
}
