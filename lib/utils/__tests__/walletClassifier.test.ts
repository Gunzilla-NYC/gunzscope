/**
 * Wallet Classifier Unit Tests
 *
 * These tests verify the wallet classification logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyWallet,
  classifyWalletSafe,
  clearWalletClassificationCache,
  clearAllWalletClassificationCaches,
  getListingCheckConfig,
  shouldCheckOpenSea,
  shouldCheckIngameMarketplace,
  WalletClassification,
  UserAccountMapping,
  WalletConnectionContext,
  WalletClassifierConfig,
} from '../walletClassifier';

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_ADDRESSES = {
  random1: '0x1234567890123456789012345678901234567890',
  random2: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  custodial: '0xcustodialwalletaddress12345678901234567',
  external1: '0xexternalwallet1address1234567890123456',
  external2: '0xexternalwallet2address1234567890123456',
  knownIngame: '0xknowningameaddress123456789012345678901',
  knownExternal: '0xknownexternaladdress12345678901234567',
  // Real-world examples
  realIngame: '0x233313e3ca673e909fee54dcc547bbd86c40b5e7',
  realExternal: '0xF9434E3057432032bB621AA5144329861869c72F',
};

// =============================================================================
// Test Cases: classifyWallet
// =============================================================================

// Clear caches before each test to prevent bleeding
beforeEach(() => {
  clearAllWalletClassificationCaches();
});

describe('classifyWallet', () => {
  it('classifies connected wallet via Dynamic as EXTERNAL', async () => {
    const connectionContext: WalletConnectionContext = {
      isConnectedWallet: true,
      connectedAddress: TEST_ADDRESSES.external1,
    };

    const result = await classifyWallet(TEST_ADDRESSES.external1, connectionContext);

    expect(result.walletType).toBe('EXTERNAL');
    expect(result.walletEvidence.signals).toContain('connected_via_wallet_provider');
    expect(result.fromCache).toBe(false);
  });

  it('classifies searched address (not connected) as UNKNOWN', async () => {
    const result = await classifyWallet(TEST_ADDRESSES.random1);

    expect(result.walletType).toBe('UNKNOWN');
    expect(result.walletEvidence.signals).toContain('searched_address_no_signal');
  });

  it('classifies mapped custodial wallet as INGAME', async () => {
    const userAccount: UserAccountMapping = {
      custodialWalletAddress: TEST_ADDRESSES.custodial,
      linkedExternalWallets: [TEST_ADDRESSES.external1],
    };

    const result = await classifyWallet(TEST_ADDRESSES.custodial, undefined, userAccount);

    expect(result.walletType).toBe('INGAME');
    expect(result.walletEvidence.signals).toContain('account_custodial_wallet');
    expect(result.fromCache).toBe(false);
  });

  it('classifies mapped linked external wallet as EXTERNAL', async () => {
    const userAccount: UserAccountMapping = {
      custodialWalletAddress: TEST_ADDRESSES.custodial,
      linkedExternalWallets: [TEST_ADDRESSES.external1, TEST_ADDRESSES.external2],
    };

    const result = await classifyWallet(TEST_ADDRESSES.external1, undefined, userAccount);

    expect(result.walletType).toBe('EXTERNAL');
    expect(result.walletEvidence.signals).toContain('account_linked_external');
  });

  it('classifies unknown address as UNKNOWN', async () => {
    const result = await classifyWallet(TEST_ADDRESSES.random1);

    expect(result.walletType).toBe('UNKNOWN');
    expect(result.walletEvidence.signals).toContain('searched_address_no_signal');
  });

  it('classifies known ingame address from config as INGAME', async () => {
    const config: Partial<WalletClassifierConfig> = {
      knownIngameAddresses: [TEST_ADDRESSES.knownIngame],
    };

    const result = await classifyWallet(TEST_ADDRESSES.knownIngame, undefined, undefined, config);

    expect(result.walletType).toBe('INGAME');
    expect(result.walletEvidence.signals).toContain('known_ingame_address');
  });

  it('classifies known external address from config as EXTERNAL', async () => {
    const config: Partial<WalletClassifierConfig> = {
      knownExternalAddresses: [TEST_ADDRESSES.knownExternal],
    };

    const result = await classifyWallet(TEST_ADDRESSES.knownExternal, undefined, undefined, config);

    expect(result.walletType).toBe('EXTERNAL');
    expect(result.walletEvidence.signals).toContain('known_external_address');
  });

  it('normalizes address case (case-insensitive matching)', async () => {
    const upperCase = TEST_ADDRESSES.custodial.toUpperCase();
    const lowerCase = TEST_ADDRESSES.custodial.toLowerCase();

    const userAccount: UserAccountMapping = {
      custodialWalletAddress: lowerCase,
    };

    const result = await classifyWallet(upperCase, undefined, userAccount);

    expect(result.walletType).toBe('INGAME');
    expect(result.address).toBe(lowerCase);
  });
});

// =============================================================================
// Test Cases: classifyWalletSafe
// =============================================================================

describe('classifyWalletSafe', () => {
  it('returns UNKNOWN on error (empty address)', async () => {
    const result = await classifyWalletSafe('');

    expect(result.walletType).toBe('UNKNOWN');
  });
});

// =============================================================================
// Test Cases: Caching
// =============================================================================

describe('Wallet Classification Caching', () => {
  it('caches classification results', async () => {
    clearWalletClassificationCache(TEST_ADDRESSES.random2);

    const result1 = await classifyWallet(TEST_ADDRESSES.random2);
    expect(result1.fromCache).toBe(false);

    const result2 = await classifyWallet(TEST_ADDRESSES.random2);
    expect(result2.fromCache).toBe(true);
    expect(result2.walletType).toBe(result1.walletType);
  });
});

// =============================================================================
// Test Cases: getListingCheckConfig
// =============================================================================

describe('getListingCheckConfig', () => {
  it('configures INGAME wallet to check ingame marketplace only', () => {
    const classification: WalletClassification = {
      walletType: 'INGAME',
      walletEvidence: { signals: ['test'] },
      address: TEST_ADDRESSES.custodial,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    const config = getListingCheckConfig(classification);

    expect(config.checkIngameMarketplace).toBe(true);
    expect(config.checkOpenSea).toBe(false);
    expect(config.priority[0]).toBe('ingame');
  });

  it('configures EXTERNAL wallet to check both marketplaces with OpenSea priority', () => {
    const classification: WalletClassification = {
      walletType: 'EXTERNAL',
      walletEvidence: { signals: ['test'] },
      address: TEST_ADDRESSES.external1,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    const config = getListingCheckConfig(classification);

    expect(config.checkOpenSea).toBe(true);
    expect(config.checkIngameMarketplace).toBe(true);
    expect(config.priority[0]).toBe('opensea');
  });

  it('configures UNKNOWN wallet to check both marketplaces with ingame priority', () => {
    const classification: WalletClassification = {
      walletType: 'UNKNOWN',
      walletEvidence: { signals: ['test'] },
      address: TEST_ADDRESSES.random1,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    const config = getListingCheckConfig(classification);

    expect(config.checkOpenSea).toBe(true);
    expect(config.checkIngameMarketplace).toBe(true);
    expect(config.priority[0]).toBe('ingame');
  });
});

// =============================================================================
// Test Cases: Helper Functions
// =============================================================================

describe('shouldCheckOpenSea', () => {
  it('returns false for INGAME wallet', () => {
    const classification: WalletClassification = {
      walletType: 'INGAME',
      walletEvidence: { signals: [] },
      address: TEST_ADDRESSES.custodial,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    expect(shouldCheckOpenSea(classification)).toBe(false);
  });

  it('returns true for EXTERNAL wallet', () => {
    const classification: WalletClassification = {
      walletType: 'EXTERNAL',
      walletEvidence: { signals: [] },
      address: TEST_ADDRESSES.external1,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    expect(shouldCheckOpenSea(classification)).toBe(true);
  });
});

describe('shouldCheckIngameMarketplace', () => {
  it('returns true for INGAME wallet', () => {
    const classification: WalletClassification = {
      walletType: 'INGAME',
      walletEvidence: { signals: [] },
      address: TEST_ADDRESSES.custodial,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    expect(shouldCheckIngameMarketplace(classification)).toBe(true);
  });

  it('returns true for EXTERNAL wallet (default enabled)', () => {
    const classification: WalletClassification = {
      walletType: 'EXTERNAL',
      walletEvidence: { signals: [] },
      address: TEST_ADDRESSES.external1,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
    };

    expect(shouldCheckIngameMarketplace(classification)).toBe(true);
  });
});
