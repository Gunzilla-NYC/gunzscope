'use client';

import { useState, useEffect } from 'react';

interface MetaMaskState {
  isInstalled: boolean;
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  error: string | null;
}

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isInstalled: false,
    isConnected: false,
    account: null,
    chainId: null,
    error: null,
  });

  useEffect(() => {
    // Check if MetaMask is installed
    const checkMetaMask = () => {
      if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        setState((prev) => ({ ...prev, isInstalled: true }));
      }
    };

    checkMetaMask();
  }, []);

  const connectWallet = async (): Promise<string | null> => {
    if (!state.isInstalled || !window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask browser extension.',
      }));
      return null;
    }

    try {
      setState((prev) => ({ ...prev, error: null }));

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const account = accounts[0];

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      setState({
        isInstalled: true,
        isConnected: true,
        account,
        chainId,
        error: null,
      });

      return account;
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to connect to MetaMask',
      }));
      return null;
    }
  };

  const switchToGunzChain = async (network: 'mainnet' | 'testnet' = 'mainnet') => {
    if (!state.isInstalled || !window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: 'MetaMask is not installed',
      }));
      return false;
    }

    const networkConfig = network === 'mainnet'
      ? {
          chainId: '0xA99B', // 43419 in hex
          chainName: 'GunzChain Mainnet',
          rpcUrls: ['https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc'],
          nativeCurrency: {
            name: 'GUN',
            symbol: 'GUN',
            decimals: 18,
          },
          blockExplorerUrls: ['https://explorer.gunzchain.io'],
        }
      : {
          chainId: '0xC099', // 49321 in hex
          chainName: 'GunzChain Testnet',
          rpcUrls: ['https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc'],
          nativeCurrency: {
            name: 'GUN',
            symbol: 'GUN',
            decimals: 18,
          },
          blockExplorerUrls: ['https://testnet.explorer.gunzchain.io'],
        };

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkConfig.chainId }],
      });

      setState((prev) => ({
        ...prev,
        chainId: networkConfig.chainId,
      }));

      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902 && window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });

          setState((prev) => ({
            ...prev,
            chainId: networkConfig.chainId,
          }));

          return true;
        } catch (addError: any) {
          console.error('Error adding GunzChain to MetaMask:', addError);
          setState((prev) => ({
            ...prev,
            error: 'Failed to add GunzChain to MetaMask',
          }));
          return false;
        }
      } else {
        console.error('Error switching to GunzChain:', switchError);
        setState((prev) => ({
          ...prev,
          error: 'Failed to switch to GunzChain',
        }));
        return false;
      }
    }
  };

  const disconnectWallet = () => {
    setState({
      isInstalled: state.isInstalled,
      isConnected: false,
      account: null,
      chainId: null,
      error: null,
    });
  };

  const getNetworkName = (chainId: string | null): string => {
    if (!chainId) return 'Unknown';

    switch (chainId) {
      case '0xA99B': // 43419
        return 'GunzChain Mainnet';
      case '0xC099': // 49321
        return 'GunzChain Testnet';
      case '0xA86A': // 43114
        return 'Avalanche C-Chain';
      case '0xA869': // 43113
        return 'Avalanche Fuji Testnet';
      case '0x1':
        return 'Ethereum Mainnet';
      default:
        return `Chain ID: ${parseInt(chainId, 16)}`;
    }
  };

  return {
    ...state,
    connectWallet,
    switchToGunzChain,
    disconnectWallet,
    getNetworkName,
  };
}

// Extend Window type for TypeScript
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
