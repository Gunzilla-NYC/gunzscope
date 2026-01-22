/**
 * OpenSea Chain Mapping Unit Tests
 *
 * These tests verify the chain slug mapping logic for OpenSea API.
 * Run with: npx vitest run lib/utils/__tests__/openseaChain.test.ts
 * (after installing vitest: npm install -D vitest)
 *
 * Or use manual testing by importing and calling runAllTests().
 */

import { toOpenSeaChain, isGunzChain } from '../openseaChain';

// =============================================================================
// Test Utilities
// =============================================================================

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

// =============================================================================
// Test Cases: toOpenSeaChain
// =============================================================================

/**
 * Test: 'avalanche' maps to 'gunzilla'
 */
async function testAvalancheToGunzilla(): Promise<void> {
  const result = toOpenSeaChain('avalanche');
  assertEqual(result, 'gunzilla', "'avalanche' should map to 'gunzilla'");
}

/**
 * Test: 'gunz' maps to 'gunzilla'
 */
async function testGunzToGunzilla(): Promise<void> {
  const result = toOpenSeaChain('gunz');
  assertEqual(result, 'gunzilla', "'gunz' should map to 'gunzilla'");
}

/**
 * Test: 'gunzilla' stays as 'gunzilla'
 */
async function testGunzillaUnchanged(): Promise<void> {
  const result = toOpenSeaChain('gunzilla');
  assertEqual(result, 'gunzilla', "'gunzilla' should remain 'gunzilla'");
}

/**
 * Test: 'ethereum' stays unchanged
 */
async function testEthereumUnchanged(): Promise<void> {
  const result = toOpenSeaChain('ethereum');
  assertEqual(result, 'ethereum', "'ethereum' should remain unchanged");
}

/**
 * Test: 'polygon' stays unchanged
 */
async function testPolygonUnchanged(): Promise<void> {
  const result = toOpenSeaChain('polygon');
  assertEqual(result, 'polygon', "'polygon' should remain unchanged");
}

/**
 * Test: Case insensitivity - 'AVALANCHE' maps to 'gunzilla'
 */
async function testCaseInsensitiveAvalanche(): Promise<void> {
  const result = toOpenSeaChain('AVALANCHE');
  assertEqual(result, 'gunzilla', "'AVALANCHE' (uppercase) should map to 'gunzilla'");
}

/**
 * Test: Case insensitivity - 'Gunz' maps to 'gunzilla'
 */
async function testCaseInsensitiveGunz(): Promise<void> {
  const result = toOpenSeaChain('Gunz');
  assertEqual(result, 'gunzilla', "'Gunz' (mixed case) should map to 'gunzilla'");
}

/**
 * Test: Trimming whitespace - ' avalanche ' maps to 'gunzilla'
 */
async function testTrimsWhitespace(): Promise<void> {
  const result = toOpenSeaChain(' avalanche ');
  assertEqual(result, 'gunzilla', "' avalanche ' (with spaces) should map to 'gunzilla'");
}

/**
 * Test: Unknown chain returns lowercase version unchanged
 */
async function testUnknownChainLowercase(): Promise<void> {
  const result = toOpenSeaChain('OPTIMISM');
  assertEqual(result, 'optimism', "'OPTIMISM' should return 'optimism' (lowercase)");
}

// =============================================================================
// Test Cases: isGunzChain
// =============================================================================

/**
 * Test: 'avalanche' is a GunzChain variant
 */
async function testIsGunzChainAvalanche(): Promise<void> {
  assertEqual(isGunzChain('avalanche'), true, "'avalanche' should be a GunzChain variant");
}

/**
 * Test: 'gunz' is a GunzChain variant
 */
async function testIsGunzChainGunz(): Promise<void> {
  assertEqual(isGunzChain('gunz'), true, "'gunz' should be a GunzChain variant");
}

/**
 * Test: 'gunzilla' is a GunzChain variant
 */
async function testIsGunzChainGunzilla(): Promise<void> {
  assertEqual(isGunzChain('gunzilla'), true, "'gunzilla' should be a GunzChain variant");
}

/**
 * Test: 'ethereum' is NOT a GunzChain variant
 */
async function testIsGunzChainEthereum(): Promise<void> {
  assertEqual(isGunzChain('ethereum'), false, "'ethereum' should NOT be a GunzChain variant");
}

/**
 * Test: 'polygon' is NOT a GunzChain variant
 */
async function testIsGunzChainPolygon(): Promise<void> {
  assertEqual(isGunzChain('polygon'), false, "'polygon' should NOT be a GunzChain variant");
}

/**
 * Test: Case insensitive - 'AVALANCHE' is a GunzChain variant
 */
async function testIsGunzChainCaseInsensitive(): Promise<void> {
  assertEqual(isGunzChain('AVALANCHE'), true, "'AVALANCHE' (uppercase) should be a GunzChain variant");
}

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Run all tests and report results
 */
export async function runAllTests(): Promise<void> {
  console.log('\n========================================');
  console.log('OpenSea Chain Mapping Tests');
  console.log('========================================\n');

  const tests = [
    // toOpenSeaChain tests
    runTest("toOpenSeaChain: 'avalanche' -> 'gunzilla'", testAvalancheToGunzilla),
    runTest("toOpenSeaChain: 'gunz' -> 'gunzilla'", testGunzToGunzilla),
    runTest("toOpenSeaChain: 'gunzilla' -> 'gunzilla'", testGunzillaUnchanged),
    runTest("toOpenSeaChain: 'ethereum' unchanged", testEthereumUnchanged),
    runTest("toOpenSeaChain: 'polygon' unchanged", testPolygonUnchanged),
    runTest("toOpenSeaChain: case insensitive (AVALANCHE)", testCaseInsensitiveAvalanche),
    runTest("toOpenSeaChain: case insensitive (Gunz)", testCaseInsensitiveGunz),
    runTest("toOpenSeaChain: trims whitespace", testTrimsWhitespace),
    runTest("toOpenSeaChain: unknown chain lowercased", testUnknownChainLowercase),
    // isGunzChain tests
    runTest("isGunzChain: 'avalanche' -> true", testIsGunzChainAvalanche),
    runTest("isGunzChain: 'gunz' -> true", testIsGunzChainGunz),
    runTest("isGunzChain: 'gunzilla' -> true", testIsGunzChainGunzilla),
    runTest("isGunzChain: 'ethereum' -> false", testIsGunzChainEthereum),
    runTest("isGunzChain: 'polygon' -> false", testIsGunzChainPolygon),
    runTest("isGunzChain: case insensitive", testIsGunzChainCaseInsensitive),
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
}

// Export individual tests for selective running
export {
  testAvalancheToGunzilla,
  testGunzToGunzilla,
  testGunzillaUnchanged,
  testEthereumUnchanged,
  testPolygonUnchanged,
  testCaseInsensitiveAvalanche,
  testCaseInsensitiveGunz,
  testTrimsWhitespace,
  testUnknownChainLowercase,
  testIsGunzChainAvalanche,
  testIsGunzChainGunz,
  testIsGunzChainGunzilla,
  testIsGunzChainEthereum,
  testIsGunzChainPolygon,
  testIsGunzChainCaseInsensitive,
};
