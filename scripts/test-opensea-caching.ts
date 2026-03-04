/**
 * Unit verification script for OpenSea caching logic
 *
 * Tests the pure helper functions that determine caching behavior:
 * - isTransientStatus(status): returns true for 429 and 5xx
 * - shouldCacheFailureStatus(status): returns true for 401, 403, 404
 *
 * Usage: npx ts-node scripts/test-opensea-caching.ts
 * Or: npx tsx scripts/test-opensea-caching.ts
 *
 * These tests verify that:
 * 1. Transient errors (429, 5xx) are correctly identified
 * 2. Hard failures (401, 403, 404) are correctly identified for caching
 * 3. Success (200) and other codes are handled correctly
 */

// Import the pure functions from both locations to verify consistency
import {
  isTransientStatus as routeIsTransient,
  shouldCacheFailureStatus as routeShouldCache,
} from '../app/api/opensea/cacheHelpers';

import {
  isTransientStatus as serviceIsTransient,
  shouldCacheFailureStatus as serviceShouldCache,
} from '../lib/api/opensea';

// Test case definition
interface TestCase {
  status: number;
  description: string;
  expectTransient: boolean;
  expectCacheable: boolean;
}

// Define test cases
const testCases: TestCase[] = [
  // Success
  { status: 200, description: 'OK success', expectTransient: false, expectCacheable: false },

  // Hard failures (should be cached)
  { status: 401, description: 'Unauthorized', expectTransient: false, expectCacheable: true },
  { status: 403, description: 'Forbidden', expectTransient: false, expectCacheable: true },
  { status: 404, description: 'Not Found', expectTransient: false, expectCacheable: true },

  // Transient errors (should NOT be cached)
  { status: 429, description: 'Rate Limited', expectTransient: true, expectCacheable: false },
  { status: 500, description: 'Internal Server Error', expectTransient: true, expectCacheable: false },
  { status: 502, description: 'Bad Gateway', expectTransient: true, expectCacheable: false },
  { status: 503, description: 'Service Unavailable', expectTransient: true, expectCacheable: false },
  { status: 504, description: 'Gateway Timeout', expectTransient: true, expectCacheable: false },
  { status: 599, description: 'Network Connect Timeout', expectTransient: true, expectCacheable: false },

  // Other client errors (not cacheable, not transient)
  { status: 400, description: 'Bad Request', expectTransient: false, expectCacheable: false },
  { status: 408, description: 'Request Timeout', expectTransient: false, expectCacheable: false },
  { status: 0, description: 'No response / internal error', expectTransient: false, expectCacheable: false },
];

// Run tests
function runTests(): { passed: number; failed: number; details: string[] } {
  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  for (const tc of testCases) {
    // Test route.ts functions
    const routeTransient = routeIsTransient(tc.status);
    const routeCacheable = routeShouldCache(tc.status);

    // Test opensea.ts functions
    const serviceTransient = serviceIsTransient(tc.status);
    const serviceCacheable = serviceShouldCache(tc.status);

    // Verify route.ts
    const routeTransientOk = routeTransient === tc.expectTransient;
    const routeCacheableOk = routeCacheable === tc.expectCacheable;

    // Verify opensea.ts
    const serviceTransientOk = serviceTransient === tc.expectTransient;
    const serviceCacheableOk = serviceCacheable === tc.expectCacheable;

    // Verify consistency between modules
    const consistentTransient = routeTransient === serviceTransient;
    const consistentCacheable = routeCacheable === serviceCacheable;

    const allOk =
      routeTransientOk &&
      routeCacheableOk &&
      serviceTransientOk &&
      serviceCacheableOk &&
      consistentTransient &&
      consistentCacheable;

    if (allOk) {
      passed++;
      details.push(`✓ ${tc.status} (${tc.description}): transient=${routeTransient}, cacheable=${routeCacheable}`);
    } else {
      failed++;
      const errors: string[] = [];
      if (!routeTransientOk) errors.push(`route.isTransient=${routeTransient}, expected=${tc.expectTransient}`);
      if (!routeCacheableOk) errors.push(`route.shouldCache=${routeCacheable}, expected=${tc.expectCacheable}`);
      if (!serviceTransientOk) errors.push(`service.isTransient=${serviceTransient}, expected=${tc.expectTransient}`);
      if (!serviceCacheableOk) errors.push(`service.shouldCache=${serviceCacheable}, expected=${tc.expectCacheable}`);
      if (!consistentTransient) errors.push(`isTransient inconsistent: route=${routeTransient}, service=${serviceTransient}`);
      if (!consistentCacheable) errors.push(`shouldCache inconsistent: route=${routeCacheable}, service=${serviceCacheable}`);
      details.push(`✗ ${tc.status} (${tc.description}): ${errors.join('; ')}`);
    }
  }

  return { passed, failed, details };
}

// Additional verification: critical guardrails
function runGuardrailTests(): { passed: number; failed: number; details: string[] } {
  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  // Guardrail 1: 429 must NEVER be cacheable
  const test429Cacheable = routeShouldCache(429);
  if (test429Cacheable === false) {
    passed++;
    details.push('✓ GUARDRAIL: 429 is NOT cacheable');
  } else {
    failed++;
    details.push('✗ GUARDRAIL VIOLATION: 429 should NOT be cacheable!');
  }

  // Guardrail 2: 429 must be transient
  const test429Transient = routeIsTransient(429);
  if (test429Transient === true) {
    passed++;
    details.push('✓ GUARDRAIL: 429 IS transient');
  } else {
    failed++;
    details.push('✗ GUARDRAIL VIOLATION: 429 should be transient!');
  }

  // Guardrail 3: All 5xx must be transient
  const serverErrors = [500, 501, 502, 503, 504, 599];
  for (const code of serverErrors) {
    if (routeIsTransient(code) && !routeShouldCache(code)) {
      passed++;
      details.push(`✓ GUARDRAIL: ${code} is transient and NOT cacheable`);
    } else {
      failed++;
      details.push(`✗ GUARDRAIL VIOLATION: ${code} should be transient and NOT cacheable!`);
    }
  }

  // Guardrail 4: transient=true should NEVER allow caching
  // This tests that the logic never caches when transient is true
  const transientCodes = [429, 500, 502, 503, 504];
  for (const code of transientCodes) {
    const isTransient = routeIsTransient(code);
    const isCacheable = routeShouldCache(code);
    if (isTransient && !isCacheable) {
      passed++;
      details.push(`✓ GUARDRAIL: transient code ${code} cannot be cached`);
    } else if (isTransient && isCacheable) {
      failed++;
      details.push(`✗ GUARDRAIL VIOLATION: transient code ${code} should NOT be cacheable!`);
    }
  }

  return { passed, failed, details };
}

// File content checks for Cache-Control header policies
import * as fs from 'fs';
import * as path from 'path';

function runFileContentChecks(): { passed: number; failed: number; details: string[] } {
  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  // Read route.ts file
  const routePath = path.join(__dirname, '../app/api/opensea/orders/route.ts');
  let routeContent: string;
  try {
    routeContent = fs.readFileSync(routePath, 'utf-8');
  } catch (err) {
    failed++;
    details.push(`✗ FILE CHECK: Could not read route.ts: ${err}`);
    return { passed, failed, details };
  }

  // Check 1: Upstream fetch uses cache: 'no-store' (regex for flexibility)
  const noStoreRegex = /cache\s*:\s*['"]no-store['"]/;
  if (noStoreRegex.test(routeContent)) {
    passed++;
    details.push("✓ FILE CHECK: route.ts uses cache: 'no-store' for upstream fetch");
  } else {
    failed++;
    details.push("✗ FILE CHECK: route.ts should use cache: 'no-store' for upstream fetch");
  }

  // Check 2: jsonWithCache helper exists and is defined
  const jsonWithCacheDefRegex = /function\s+jsonWithCache\s*\(/;
  if (jsonWithCacheDefRegex.test(routeContent)) {
    passed++;
    details.push("✓ FILE CHECK: route.ts defines jsonWithCache helper");
  } else {
    failed++;
    details.push("✗ FILE CHECK: route.ts should define jsonWithCache helper");
  }

  // Check 3: jsonWithCache is used at least 4 times (param validation, transient, hard failure, success, catch)
  // Definition uses "function jsonWithCache(", returns use "return jsonWithCache("
  const returnUsages = (routeContent.match(/return\s+jsonWithCache\s*\(/g) || []).length;
  if (returnUsages >= 4) {
    passed++;
    details.push(`✓ FILE CHECK: route.ts uses jsonWithCache in ${returnUsages} return statements`);
  } else {
    failed++;
    details.push(`✗ FILE CHECK: route.ts should use jsonWithCache in at least 4 return statements (found ${returnUsages})`);
  }

  // Check 4: Cache-Control constants are defined (regex for flexibility)
  const cacheConstantsRegex = /CACHE_NO_STORE\s*=\s*['"]no-store['"]/;
  const cacheSuccessRegex = /CACHE_SUCCESS\s*=\s*['"]public,\s*s-maxage=300/;
  const cacheHardFailRegex = /CACHE_HARD_FAILURE\s*=\s*['"]public,\s*s-maxage=600/;

  if (cacheConstantsRegex.test(routeContent) && cacheSuccessRegex.test(routeContent) && cacheHardFailRegex.test(routeContent)) {
    passed++;
    details.push("✓ FILE CHECK: route.ts defines cache control constants (NO_STORE, SUCCESS, HARD_FAILURE)");
  } else {
    failed++;
    details.push("✗ FILE CHECK: route.ts should define CACHE_NO_STORE, CACHE_SUCCESS, CACHE_HARD_FAILURE constants");
  }

  // Check 5: resolveCacheControl helper exists
  const resolveCacheControlDefRegex = /function\s+resolveCacheControl\s*\(/;
  if (resolveCacheControlDefRegex.test(routeContent)) {
    passed++;
    details.push("✓ FILE CHECK: route.ts defines resolveCacheControl helper");
  } else {
    failed++;
    details.push("✗ FILE CHECK: route.ts should define resolveCacheControl helper");
  }

  // Check 6: resolveCacheControl is used in return statements (should be at least 4)
  const resolveCacheControlUsages = (routeContent.match(/resolveCacheControl\s*\(/g) || []).length;
  // Subtract 1 for the definition
  if (resolveCacheControlUsages >= 5) {
    passed++;
    details.push(`✓ FILE CHECK: route.ts uses resolveCacheControl in ${resolveCacheControlUsages - 1} locations`);
  } else {
    failed++;
    details.push(`✗ FILE CHECK: route.ts should use resolveCacheControl in at least 4 return paths (found ${resolveCacheControlUsages - 1})`);
  }

  // Check 7: debug=1 forces no-store (resolveCacheControl checks debug first)
  // Look for pattern: if (debug === true) { return CACHE_NO_STORE }
  const debugNoStoreRegex = /if\s*\(\s*debug\s*===\s*true\s*\)\s*\{?\s*return\s+CACHE_NO_STORE/;
  if (debugNoStoreRegex.test(routeContent)) {
    passed++;
    details.push("✓ FILE CHECK: route.ts forces CACHE_NO_STORE when debug=1");
  } else {
    failed++;
    details.push("✗ FILE CHECK: route.ts should force CACHE_NO_STORE when debug=1");
  }

  // Check 8: Error messages are status-specific (regex for flexibility)
  const errorMsgPatterns = [
    /OpenSea\s+rate\s+limited\s*\(429\)/i,
    /OpenSea\s+auth\s+error/i,
    /OpenSea\s+not\s+found\s*\(404\)/i,
    /OpenSea\s+upstream\s+error/i,
  ];
  const allErrorMsgsFound = errorMsgPatterns.every(pattern => pattern.test(routeContent));
  if (allErrorMsgsFound) {
    passed++;
    details.push("✓ FILE CHECK: route.ts has status-specific error messages");
  } else {
    failed++;
    details.push("✗ FILE CHECK: route.ts should have status-specific error messages (429, auth, 404, 5xx)");
  }

  // Check 9: opensea.ts has NaN normalization
  const openseaPath = path.join(__dirname, '../lib/api/opensea.ts');
  let openseaContent: string;
  try {
    openseaContent = fs.readFileSync(openseaPath, 'utf-8');
  } catch (err) {
    failed++;
    details.push(`✗ FILE CHECK: Could not read opensea.ts: ${err}`);
    return { passed, failed, details };
  }

  // Check for normalizePrice function definition
  const normalizePriceDefRegex = /function\s+normalizePrice\s*\(/;
  if (normalizePriceDefRegex.test(openseaContent)) {
    passed++;
    details.push("✓ FILE CHECK: opensea.ts defines normalizePrice helper");
  } else {
    failed++;
    details.push("✗ FILE CHECK: opensea.ts should define normalizePrice helper");
  }

  // Check that normalizePrice is used in both browser and server paths
  const normalizePriceUsages = (openseaContent.match(/normalizePrice\s*\(/g) || []).length;
  // Expect at least 3 usages: definition + browser path (2 calls) + server path (2 calls) = 5 minimum
  // But let's be lenient and check for at least 3 usages beyond the definition
  if (normalizePriceUsages >= 4) {
    passed++;
    details.push(`✓ FILE CHECK: opensea.ts uses normalizePrice in ${normalizePriceUsages - 1} locations`);
  } else {
    failed++;
    details.push(`✗ FILE CHECK: opensea.ts should use normalizePrice in both browser and server paths (found ${normalizePriceUsages - 1} usages)`);
  }

  return { passed, failed, details };
}

// Main
async function main() {
  console.log('========================================');
  console.log('OpenSea Caching Logic Verification');
  console.log('========================================\n');

  console.log('Testing pure helper functions...\n');

  // Run basic tests
  const basicResults = runTests();
  console.log('Basic Function Tests:');
  console.log('---------------------');
  for (const detail of basicResults.details) {
    console.log(detail);
  }
  console.log('');

  // Run guardrail tests
  const guardrailResults = runGuardrailTests();
  console.log('Guardrail Tests:');
  console.log('----------------');
  for (const detail of guardrailResults.details) {
    console.log(detail);
  }
  console.log('');

  // Run file content checks
  const fileCheckResults = runFileContentChecks();
  console.log('File Content Checks:');
  console.log('--------------------');
  for (const detail of fileCheckResults.details) {
    console.log(detail);
  }
  console.log('');

  // Summary
  const totalPassed = basicResults.passed + guardrailResults.passed + fileCheckResults.passed;
  const totalFailed = basicResults.failed + guardrailResults.failed + fileCheckResults.failed;

  console.log('========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Basic tests:       ${basicResults.passed} passed, ${basicResults.failed} failed`);
  console.log(`Guardrail tests:   ${guardrailResults.passed} passed, ${guardrailResults.failed} failed`);
  console.log(`File content:      ${fileCheckResults.passed} passed, ${fileCheckResults.failed} failed`);
  console.log(`Total:             ${totalPassed} passed, ${totalFailed} failed`);

  if (totalFailed === 0) {
    console.log('\n✓ All tests passed! Caching logic is correct.');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed! Review the caching logic.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
