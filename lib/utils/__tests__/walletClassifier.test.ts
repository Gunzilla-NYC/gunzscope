/**
 * Wallet Classifier Unit Tests
 *
 * These tests verify the wallet classification logic.
 * Run with: npx vitest run lib/utils/__tests__/walletClassifier.test.ts
 * (after installing vitest: npm install -D vitest)
 *
 * Or use manual testing by importing and calling the functions.
 */

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
  DEFAULT_WALLET_CLASSIFIER_CONFIG,
} from '../walletClassifier';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Simple test runner for manual execution
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  try {
    await testFn();
    return { name, passed: true };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertIncludes(array: string[], item: string, message?: string): void {
  if (!array.includes(item)) {
    throw new Error(
      message || `Expected array to include "${item}", got [${array.join(', ')}]`
    );
  }
}

// =============================================================================
// Test Cases
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

/**
 * Test: Connected wallet via Dynamic returns EXTERNAL
 * This is the highest priority signal - proving key ownership means external wallet
 */
async function testConnectedWalletClassification(): Promise<void> {
  const connectionContext: WalletConnectionContext = {
    isConnectedWallet: true,
    connectedAddress: TEST_ADDRESSES.external1,
  };

  const result = await classifyWallet(TEST_ADDRESSES.external1, connectionContext);

  assertEqual(result.walletType, 'EXTERNAL', 'Connected wallet should be EXTERNAL');
  assertIncludes(
    result.walletEvidence.signals,
    'connected_via_wallet_provider',
    'Should have connected wallet signal'
  );
  assertEqual(result.fromCache, false, 'First call should not be from cache');
}

/**
 * Test: Searched address (not connected) returns UNKNOWN
 */
async function testSearchedAddressClassification(): Promise<void> {
  // No connection context - this is a searched address
  const result = await classifyWallet(TEST_ADDRESSES.random1);

  assertEqual(result.walletType, 'UNKNOWN', 'Searched address should be UNKNOWN');
  assertIncludes(
    result.walletEvidence.signals,
    'searched_address_no_signal',
    'Should indicate searched address with no signal'
  );
}

/**
 * Test: Mapped custodial wallet returns INGAME
 */
async function testCustodialWalletClassification(): Promise<void> {
  const userAccount: UserAccountMapping = {
    custodialWalletAddress: TEST_ADDRESSES.custodial,
    linkedExternalWallets: [TEST_ADDRESSES.external1],
  };

  const result = await classifyWallet(TEST_ADDRESSES.custodial, undefined, userAccount);

  assertEqual(result.walletType, 'INGAME', 'Custodial wallet should be INGAME');
  assertIncludes(
    result.walletEvidence.signals,
    'account_custodial_wallet',
    'Should have custodial signal'
  );
  assertEqual(result.fromCache, false, 'First call should not be from cache');
}

/**
 * Test: Mapped linked external wallet returns EXTERNAL
 */
async function testLinkedExternalWalletClassification(): Promise<void> {
  const userAccount: UserAccountMapping = {
    custodialWalletAddress: TEST_ADDRESSES.custodial,
    linkedExternalWallets: [TEST_ADDRESSES.external1, TEST_ADDRESSES.external2],
  };

  const result = await classifyWallet(TEST_ADDRESSES.external1, undefined, userAccount);

  assertEqual(result.walletType, 'EXTERNAL', 'Linked wallet should be EXTERNAL');
  assertIncludes(
    result.walletEvidence.signals,
    'account_linked_external',
    'Should have linked external signal'
  );
}

/**
 * Test: Unknown address returns UNKNOWN (legacy test)
 */
async function testUnknownAddressClassification(): Promise<void> {
  // No user account mapping provided, no connection context
  const result = await classifyWallet(TEST_ADDRESSES.random1);

  assertEqual(result.walletType, 'UNKNOWN', 'Random address should be UNKNOWN');
  assertIncludes(
    result.walletEvidence.signals,
    'searched_address_no_signal',
    'Should indicate searched address with no signal'
  );
}

/**
 * Test: Known ingame address from config returns INGAME
 */
async function testKnownIngameAddressClassification(): Promise<void> {
  const config: Partial<WalletClassifierConfig> = {
    knownIngameAddresses: [TEST_ADDRESSES.knownIngame],
  };

  const result = await classifyWallet(TEST_ADDRESSES.knownIngame, undefined, undefined, config);

  assertEqual(result.walletType, 'INGAME', 'Known ingame address should be INGAME');
  assertIncludes(
    result.walletEvidence.signals,
    'known_ingame_address',
    'Should have known ingame signal'
  );
}

/**
 * Test: Known external address from config returns EXTERNAL
 */
async function testKnownExternalAddressClassification(): Promise<void> {
  const config: Partial<WalletClassifierConfig> = {
    knownExternalAddresses: [TEST_ADDRESSES.knownExternal],
  };

  const result = await classifyWallet(TEST_ADDRESSES.knownExternal, undefined, undefined, config);

  assertEqual(result.walletType, 'EXTERNAL', 'Known external address should be EXTERNAL');
  assertIncludes(
    result.walletEvidence.signals,
    'known_external_address',
    'Should have known external signal'
  );
}

/**
 * Test: Error handling returns UNKNOWN via classifyWalletSafe
 */
async function testErrorHandlingReturnsUnknown(): Promise<void> {
  // classifyWalletSafe should never throw, even with invalid input
  const result = await classifyWalletSafe('');

  assertEqual(result.walletType, 'UNKNOWN', 'Error case should return UNKNOWN');
}

/**
 * Test: Caching works (second call hits cache)
 */
async function testCachingWorks(): Promise<void> {
  // Clear cache first
  clearWalletClassificationCache(TEST_ADDRESSES.random2);

  // First call
  const result1 = await classifyWallet(TEST_ADDRESSES.random2);
  assertEqual(result1.fromCache, false, 'First call should not be from cache');

  // Second call should hit cache
  const result2 = await classifyWallet(TEST_ADDRESSES.random2);
  assertEqual(result2.fromCache, true, 'Second call should be from cache');
  assertEqual(
    result2.walletType,
    result1.walletType,
    'Cached result should match original'
  );
}

/**
 * Test: Address normalization (case-insensitive)
 */
async function testAddressNormalization(): Promise<void> {
  const upperCase = TEST_ADDRESSES.custodial.toUpperCase();
  const lowerCase = TEST_ADDRESSES.custodial.toLowerCase();

  const userAccount: UserAccountMapping = {
    custodialWalletAddress: lowerCase,
  };

  // Query with uppercase, mapping has lowercase
  const result = await classifyWallet(upperCase, undefined, userAccount);

  assertEqual(result.walletType, 'INGAME', 'Should match regardless of case');
  assertEqual(
    result.address,
    lowerCase,
    'Result address should be normalized to lowercase'
  );
}

/**
 * Test: getListingCheckConfig for INGAME wallet
 */
async function testListingConfigIngame(): Promise<void> {
  const classification: WalletClassification = {
    walletType: 'INGAME',
    walletEvidence: { signals: ['test'] },
    address: TEST_ADDRESSES.custodial,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  const config = getListingCheckConfig(classification);

  assertEqual(config.checkIngameMarketplace, true, 'INGAME should check ingame marketplace');
  assertEqual(config.checkOpenSea, false, 'INGAME should not check OpenSea by default');
  assertEqual(config.priority[0], 'ingame', 'INGAME priority should be ingame first');
}

/**
 * Test: getListingCheckConfig for EXTERNAL wallet
 */
async function testListingConfigExternal(): Promise<void> {
  const classification: WalletClassification = {
    walletType: 'EXTERNAL',
    walletEvidence: { signals: ['test'] },
    address: TEST_ADDRESSES.external1,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  const config = getListingCheckConfig(classification);

  assertEqual(config.checkOpenSea, true, 'EXTERNAL should check OpenSea');
  assertEqual(config.checkIngameMarketplace, true, 'EXTERNAL should check ingame by default');
  assertEqual(config.priority[0], 'opensea', 'EXTERNAL priority should be opensea first');
}

/**
 * Test: getListingCheckConfig for UNKNOWN wallet
 */
async function testListingConfigUnknown(): Promise<void> {
  const classification: WalletClassification = {
    walletType: 'UNKNOWN',
    walletEvidence: { signals: ['test'] },
    address: TEST_ADDRESSES.random1,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  const config = getListingCheckConfig(classification);

  assertEqual(config.checkOpenSea, true, 'UNKNOWN should check OpenSea');
  assertEqual(config.checkIngameMarketplace, true, 'UNKNOWN should check ingame');
  assertEqual(config.priority[0], 'ingame', 'UNKNOWN priority should be ingame first (Gunzilla-native)');
}

/**
 * Test: shouldCheckOpenSea helper function
 */
async function testShouldCheckOpenSeaHelper(): Promise<void> {
  const ingame: WalletClassification = {
    walletType: 'INGAME',
    walletEvidence: { signals: [] },
    address: TEST_ADDRESSES.custodial,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  const external: WalletClassification = {
    walletType: 'EXTERNAL',
    walletEvidence: { signals: [] },
    address: TEST_ADDRESSES.external1,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  assertEqual(shouldCheckOpenSea(ingame), false, 'INGAME should not check OpenSea');
  assertEqual(shouldCheckOpenSea(external), true, 'EXTERNAL should check OpenSea');
}

/**
 * Test: shouldCheckIngameMarketplace helper function
 */
async function testShouldCheckIngameHelper(): Promise<void> {
  const ingame: WalletClassification = {
    walletType: 'INGAME',
    walletEvidence: { signals: [] },
    address: TEST_ADDRESSES.custodial,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  const external: WalletClassification = {
    walletType: 'EXTERNAL',
    walletEvidence: { signals: [] },
    address: TEST_ADDRESSES.external1,
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  assertEqual(shouldCheckIngameMarketplace(ingame), true, 'INGAME should check ingame');
  assertEqual(shouldCheckIngameMarketplace(external), true, 'EXTERNAL should check ingame (default enabled)');
}

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Run all tests and report results
 */
export async function runAllTests(): Promise<void> {
  console.log('\n========================================');
  console.log('Wallet Classifier Tests');
  console.log('========================================\n');

  // Clear all caches before running tests
  clearAllWalletClassificationCaches();

  const tests = [
    runTest('Connected wallet (Dynamic) -> EXTERNAL', testConnectedWalletClassification),
    runTest('Searched address -> UNKNOWN', testSearchedAddressClassification),
    runTest('Custodial wallet -> INGAME', testCustodialWalletClassification),
    runTest('Linked external wallet -> EXTERNAL', testLinkedExternalWalletClassification),
    runTest('Unknown address -> UNKNOWN', testUnknownAddressClassification),
    runTest('Known ingame address -> INGAME', testKnownIngameAddressClassification),
    runTest('Known external address -> EXTERNAL', testKnownExternalAddressClassification),
    runTest('Error handling -> UNKNOWN', testErrorHandlingReturnsUnknown),
    runTest('Caching works', testCachingWorks),
    runTest('Address normalization (case-insensitive)', testAddressNormalization),
    runTest('Listing config for INGAME', testListingConfigIngame),
    runTest('Listing config for EXTERNAL', testListingConfigExternal),
    runTest('Listing config for UNKNOWN', testListingConfigUnknown),
    runTest('shouldCheckOpenSea helper', testShouldCheckOpenSeaHelper),
    runTest('shouldCheckIngameMarketplace helper', testShouldCheckIngameHelper),
  ];

  const results = await Promise.all(tests);

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.passed) {
      console.log(`  ✓ ${result.name}`);
      passed++;
    } else {
      console.log(`  ✗ ${result.name}`);
      console.log(`    Error: ${result.error}`);
      failed++;
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  // Clean up
  clearAllWalletClassificationCaches();
}

// Export individual tests for selective running
export {
  testConnectedWalletClassification,
  testSearchedAddressClassification,
  testCustodialWalletClassification,
  testLinkedExternalWalletClassification,
  testUnknownAddressClassification,
  testKnownIngameAddressClassification,
  testKnownExternalAddressClassification,
  testErrorHandlingReturnsUnknown,
  testCachingWorks,
  testAddressNormalization,
  testListingConfigIngame,
  testListingConfigExternal,
  testListingConfigUnknown,
  testShouldCheckOpenSeaHelper,
  testShouldCheckIngameHelper,
};
