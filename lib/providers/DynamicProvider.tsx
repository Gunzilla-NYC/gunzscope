'use client';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

  if (!environmentId) {
    console.warn('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not set');
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId || '',
        walletConnectors: [EthereumWalletConnectors],
        // Add custom EVM chain for GunzChain
        overrides: {
          evmNetworks: [
            {
              blockExplorerUrls: ['https://explorer.gunzchain.io'],
              chainId: 43419,
              chainName: 'GunzChain Mainnet',
              iconUrls: [],
              name: 'GunzChain Mainnet',
              nativeCurrency: {
                decimals: 18,
                name: 'GUN',
                symbol: 'GUN',
              },
              networkId: 43419,
              rpcUrls: ['https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc'],
              vanityName: 'GunzChain',
            },
            {
              blockExplorerUrls: ['https://testnet.explorer.gunzchain.io'],
              chainId: 49321,
              chainName: 'GunzChain Testnet',
              iconUrls: [],
              name: 'GunzChain Testnet',
              nativeCurrency: {
                decimals: 18,
                name: 'GUN',
                symbol: 'GUN',
              },
              networkId: 49321,
              rpcUrls: ['https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc'],
              vanityName: 'GunzChain Testnet',
            },
          ],
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
