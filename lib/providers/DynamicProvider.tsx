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
    background: rgba(22, 22, 22, 0.88) !important;
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

  /* ════════════════════════════════════════════════
     Network Switch — visibility & spacing

     DOM structure (from SDK source):
       .network-switch-control__container  → button
       .popper-content → .dropdown → .network-action → .network
       .network-not-supported  → full "wrong network" panel

     The dropdown renders via Popper portal OUTSIDE
     .modal-card, so we must target .dropdown directly.
     Brand alert color: #FF5555 (--gs-loss).
     ════════════════════════════════════════════════ */

  /* ── "Switch Network" button ── */
  .network-switch-control__container {
    background: rgba(22, 22, 22, 0.9) !important;
    border: 1px solid rgba(166, 247, 0, 0.3) !important;
    color: #F0F0F0 !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
    font-family: 'JetBrains Mono', monospace !important;
    gap: 8px !important;
  }

  .network-switch-control__container:hover {
    border-color: rgba(166, 247, 0, 0.5) !important;
    background: rgba(36, 36, 36, 0.95) !important;
  }

  .network-switch-control__container--error {
    border-color: rgba(255, 85, 85, 0.4) !important;
  }

  .network-switch-control__network-name,
  .evm-network-control__network-name {
    color: #F0F0F0 !important;
    font-size: 13px !important;
    font-family: 'JetBrains Mono', monospace !important;
  }

  .network-switch-control__arrow-icon,
  .network-switch-control__arrow-icon--active {
    color: rgba(166, 247, 0, 0.6) !important;
  }

  /* ── Dropdown container (Popper portal) ── */
  .dropdown {
    background: #141414 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7) !important;
  }

  /* ── Network list rows inside dropdown ── */
  .network-action {
    padding: 12px 16px !important;
    color: #F0F0F0 !important;
    font-size: 14px !important;
    background: #141414 !important;
  }

  .network-action:not(.network--not-supported):hover {
    background: rgba(166, 247, 0, 0.06) !important;
  }

  /* ── Network item content ── */
  .network {
    color: #F0F0F0 !important;
  }

  /* Row that holds icon + title — force gap */
  .network .network__container {
    gap: 12px !important;
    align-items: center !important;
  }

  /* Icon (exclamation) — larger, brighter */
  .network__title-icon {
    color: #FF5555 !important;
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    margin-right: 12px !important;
    flex-shrink: 0 !important;
    filter: drop-shadow(0 0 6px rgba(255, 85, 85, 0.6)) !important;
  }

  .network__title-icon svg,
  .network__title-icon img {
    width: 22px !important;
    height: 22px !important;
  }

  /* Network name text */
  .network__title-copy {
    color: #F0F0F0 !important;
    font-size: 14px !important;
    font-family: 'JetBrains Mono', monospace !important;
  }

  /* Status dot */
  .network .network__status-container {
    color: rgba(166, 247, 0, 0.7) !important;
  }

  .network .network__status-container--active {
    background-color: #A6F700 !important;
  }

  /* ── "Update Network" panel ── */
  .network-not-supported {
    padding: 24px 20px !important;
    gap: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
  }

  .network-not-supported__content-container,
  .network-not-supported__content-container--error {
    color: #CCCCCC !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
    gap: 12px !important;
  }

  .network-not-supported__welcome-container {
    color: #F0F0F0 !important;
    font-family: 'Chakra Petch', sans-serif !important;
    font-weight: 600 !important;
    font-size: 16px !important;
  }

  .network-not-supported__error--not-supported {
    color: #FF5555 !important;
  }

  .network-not-supported__network-container {
    gap: 8px !important;
    width: 100% !important;
  }

  .network-not-supported__network-picker {
    width: 100% !important;
  }

  .network-not-supported__network-picker-button,
  .select-network-button {
    background: rgba(22, 22, 22, 0.9) !important;
    border: 1px solid rgba(166, 247, 0, 0.3) !important;
    color: #F0F0F0 !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
    font-family: 'JetBrains Mono', monospace !important;
  }

  .network-not-supported__network-picker-button:hover,
  .select-network-button:hover {
    border-color: rgba(166, 247, 0, 0.5) !important;
    background: rgba(36, 36, 36, 0.95) !important;
  }

  /* ── Pending connect / signature views — match modal transparency ──
     DOM: .modal-card → .prompt-modal → .default-prompt-modal
     All intermediate wrappers must be transparent so the
     modal-card glass bg shows through.
     ──────────────────────────────────────────────────────── */
  .prompt-modal,
  .default-prompt-modal,
  .default-prompt-modal__content,
  .default-prompt-modal__icon-with-spinner,
  .pending-connect__container,
  .pending-signature__container {
    background: transparent !important;
    background-color: transparent !important;
  }

  .pending-connect__copy-text,
  .pending-signature__copy,
  .default-prompt-modal__content {
    color: #CCCCCC !important;
  }

  /* ── Manual switch view ── */
  .network-not-supported-switch-manual {
    padding: 24px 20px !important;
    gap: 16px !important;
  }

  .network-not-supported-switch-manual__title {
    color: #F0F0F0 !important;
    font-family: 'Chakra Petch', sans-serif !important;
    font-weight: 600 !important;
  }

  .network-not-supported-switch-manual__content {
    color: #CCCCCC !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
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
        // Force network switch to a configured chain on connect
        networkValidationMode: 'always',
        // Add custom EVM chain for GunzChain (first = default)
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
