'use client';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

/**
 * GUNZscope brand overrides for the Dynamic Labs auth modal.
 *
 * Two-layer approach:
 *   1. `theme` prop — activates dark mode + sets brand color via ThemeData
 *   2. `cssOverrides` — overrides CSS custom properties for our exact design tokens
 *
 * Dynamic's CSS vars are defined globally on `:root [data-dynamic-theme=dark]`
 * and inherit into the shadow DOM. We override them on `.dynamic-shadow-dom`
 * (the actual wrapper element) and `.dynamic-shadow-dom-content` (shadow root child).
 */
const cssOverrides = `
  /* ════════════════════════════════════════════════
     CSS Variable Overrides (design tokens)
     ════════════════════════════════════════════════ */

  .dynamic-shadow-dom,
  .dynamic-shadow-dom-content {
    --dynamic-font-family-primary: 'JetBrains Mono', 'Chakra Petch', monospace !important;
    --dynamic-font-family-numbers: 'JetBrains Mono', monospace !important;

    /* ── Backgrounds (transparent for glass) ── */
    --dynamic-base-1: transparent !important;
    --dynamic-base-2: rgba(28, 28, 28, 0.5) !important;
    --dynamic-base-3: rgba(36, 36, 36, 0.6) !important;
    --dynamic-base-4: rgba(17, 17, 17, 0.6) !important;

    /* ── Text ── */
    --dynamic-text-primary: #F0F0F0 !important;
    --dynamic-text-secondary: #999999 !important;
    --dynamic-text-tertiary: #555555 !important;

    /* ── Brand accent (lime) ── */
    --dynamic-brand-primary-color: #A6F700 !important;
    --dynamic-brand-hover-color: #B8FF33 !important;
    --dynamic-brand-secondary-color: rgba(166, 247, 0, 0.15) !important;

    /* ── Borders & radius (sharp edges) ── */
    --dynamic-border-radius: 0px !important;
    --dynamic-border: 1px solid rgba(255, 255, 255, 0.06) !important;

    /* ── Modal ── */
    --dynamic-modal-backdrop-background: rgba(0, 0, 0, 0.6) !important;
    --dynamic-modal-backdrop-filter: blur(4px) !important;
    --dynamic-modal-padding: 0 !important;

    /* ── Wallet tiles ── */
    --dynamic-wallet-list-tile-background: rgba(28, 28, 28, 0.5) !important;
    --dynamic-wallet-list-tile-border: 1px solid rgba(255, 255, 255, 0.06) !important;
    --dynamic-wallet-list-tile-shadow: none !important;
    --dynamic-wallet-list-max-height: 360px !important;
    --dynamic-wallet-list-tile-background-hover: rgba(36, 36, 36, 0.7) !important;
    --dynamic-wallet-list-tile-border-hover: 1px solid rgba(166, 247, 0, 0.25) !important;

    /* ── Search ── */
    --dynamic-search-bar-background: rgba(10, 10, 10, 0.6) !important;
    --dynamic-search-bar-border: 1px solid rgba(255, 255, 255, 0.06) !important;
    --dynamic-search-bar-background-hover: rgba(28, 28, 28, 0.5) !important;
    --dynamic-search-bar-background-focus: rgba(28, 28, 28, 0.5) !important;
    --dynamic-search-bar-border-focus: 1px solid rgba(166, 247, 0, 0.2) !important;

    /* ── Footer ── */
    --dynamic-footer-background: rgba(10, 10, 10, 0.3) !important;
    --dynamic-footer-border-top: 1px solid rgba(255, 255, 255, 0.06) !important;

    /* ── Header ── */
    --dynamic-header-background: transparent !important;
    --dynamic-header-border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;

    /* ── Shadows (disabled — glass doesn't need them) ── */
    --dynamic-shadow-down-1: none !important;
    --dynamic-shadow-down-3: none !important;

    /* ── Connect button ── */
    --dynamic-connect-button-background: #A6F700 !important;
    --dynamic-connect-button-color: #0A0A0A !important;
    --dynamic-connect-button-border: none !important;
    --dynamic-connect-button-radius: 0px !important;
    --dynamic-connect-button-background-hover: #B8FF33 !important;

    /* ── Buttons ── */
    --dynamic-button-primary-background: #A6F700 !important;
    --dynamic-button-primary-border: none !important;
    --dynamic-button-secondary-background: rgba(28, 28, 28, 0.5) !important;
    --dynamic-button-secondary-border: 1px solid rgba(255, 255, 255, 0.06) !important;

    /* ── Badge ── */
    --dynamic-badge-primary-background: rgba(166, 247, 0, 0.1) !important;
    --dynamic-badge-primary-color: #A6F700 !important;
    --dynamic-badge-dot-background: #A6F700 !important;
    --dynamic-badge-background: rgba(166, 247, 0, 0.1) !important;
    --dynamic-badge-color: #A6F700 !important;

    /* ── Status ── */
    --dynamic-success-1: rgba(0, 255, 136, 0.15) !important;
    --dynamic-success-2: #00FF88 !important;
    --dynamic-error-1: rgba(255, 85, 85, 0.15) !important;
    --dynamic-error-2: #FF5555 !important;

    /* ── Hover ── */
    --dynamic-hover: rgba(255, 255, 255, 0.04) !important;

    /* ── Misc ── */
    --dynamic-text-link: #A6F700 !important;
    --dynamic-overlay: rgba(0, 0, 0, 0.6) !important;
  }

  /* ════════════════════════════════════════════════
     Modal Card — corner notch + accent line

     clip-path and backdrop-filter cannot coexist on
     the same element, and .modal-component__container
     is full-screen (wraps backdrop + card) so it
     can't hold clip-path either. We use clip-path
     on .modal-card with a dark semi-transparent bg.
     ════════════════════════════════════════════════ */

  .modal-card {
    background: rgba(22, 22, 22, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 0 !important;
    clip-path: polygon(
      0 0,
      calc(100% - 16px) 0,
      100% 16px,
      100% 100%,
      16px 100%,
      0 calc(100% - 16px)
    ) !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  /* Gradient accent line (lime → purple) */
  .modal-card::before {
    content: '' !important;
    display: block !important;
    width: 100% !important;
    height: 2px !important;
    background: linear-gradient(to right, #A6F700, #6D5BFF) !important;
    flex-shrink: 0 !important;
  }

  /* Backdrop */
  .modal-component__backdrop {
    background: rgba(0, 0, 0, 0.6) !important;
  }

  /* Header — transparent to match card bg */
  .modal-header {
    background: transparent !important;
  }

  /* All internal border-radius → 0 for sharp edges */
  .modal-card * {
    border-radius: 0 !important;
  }
`;

/**
 * ThemeData object — activates dark mode and sets brand color.
 * This is the structured approach; cssOverrides handles the fine-grained tokens.
 */
const gunzscopeTheme = {
  border: 'square' as const,
  brandStyle: 'bold' as const,
  customColor: '#A6F700',
  template: 'default',
  theme: {
    colors: {
      accent_1: '#1C1C1C',
      accent_2: '#242424',
      accent_3: '#333333',
      background: '#161616',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      error_1: 'rgba(255, 85, 85, 0.15)',
      error_2: '#FF5555',
      footer: '#111111',
      primary: '#111111',
      secondary: '#1C1C1C',
      ternary: '#A6F700',
      textPrimary: '#F0F0F0',
      textSecondary: '#999999',
    },
    name: 'dark' as const,
  },
  view: 'extended' as const,
};

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

  if (!environmentId) {
    console.warn('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not set');
  }

  return (
    <DynamicContextProvider
      theme={gunzscopeTheme}
      settings={{
        environmentId: environmentId || '',
        walletConnectors: [EthereumWalletConnectors],
        cssOverrides,
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
