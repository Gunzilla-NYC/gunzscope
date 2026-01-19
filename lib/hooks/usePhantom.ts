'use client';

import { useState, useEffect } from 'react';

interface PhantomState {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  error: string | null;
}

export function usePhantom() {
  const [state, setState] = useState<PhantomState>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    error: null,
  });

  useEffect(() => {
    // Check if Phantom is installed
    const checkPhantom = () => {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        setState((prev) => ({ ...prev, isInstalled: true }));
      }
    };

    checkPhantom();
  }, []);

  const connectWallet = async (): Promise<string | null> => {
    if (!state.isInstalled || !window.solana?.isPhantom) {
      setState((prev) => ({
        ...prev,
        error: 'Phantom is not installed. Please install Phantom wallet extension.',
      }));
      return null;
    }

    try {
      setState((prev) => ({ ...prev, error: null }));

      // Request connection
      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();

      setState({
        isInstalled: true,
        isConnected: true,
        publicKey,
        error: null,
      });

      return publicKey;
    } catch (error: any) {
      console.error('Error connecting to Phantom:', error);

      // User rejected the request
      if (error.code === 4001) {
        setState((prev) => ({
          ...prev,
          error: 'Connection request rejected',
        }));
      } else {
        setState((prev) => ({
          ...prev,
          error: error.message || 'Failed to connect to Phantom',
        }));
      }
      return null;
    }
  };

  const disconnectWallet = async () => {
    if (window.solana?.isPhantom) {
      try {
        await window.solana.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Phantom:', error);
      }
    }

    setState({
      isInstalled: state.isInstalled,
      isConnected: false,
      publicKey: null,
      error: null,
    });
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
  };
}

// Extend Window type for TypeScript
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
