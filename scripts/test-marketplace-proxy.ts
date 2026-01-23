/**
 * Dev verification script for marketplace proxy routes
 *
 * Usage: npx ts-node scripts/test-marketplace-proxy.ts
 * Or: npx tsx scripts/test-marketplace-proxy.ts
 *
 * Requires the Next.js dev server to be running on localhost:3000
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  status: number;
  configured: boolean | undefined;
  error: string | undefined;
  preview: string;
}

async function testEndpoint(
  path: string,
  params: Record<string, string>
): Promise<TestResult> {
  const url = new URL(path, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await response.json();
    const preview = JSON.stringify(data).slice(0, 120);

    return {
      endpoint: path,
      status: response.status,
      configured: data.configured,
      error: data.error,
      preview: preview.length >= 120 ? preview + '...' : preview,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      endpoint: path,
      status: 0,
      configured: undefined,
      error: message,
      preview: 'FETCH_ERROR',
    };
  }
}

async function main() {
  console.log('========================================');
  console.log('Marketplace Proxy Routes Verification');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================\n');

  // Test /api/marketplace/purchases/token
  const tokenResult = await testEndpoint('/api/marketplace/purchases/token', {
    chain: 'avalanche',
    contract: '0x0000000000000000000000000000000000000000',
    tokenId: '1',
  });

  // Test /api/marketplace/purchases/wallet
  const walletResult = await testEndpoint('/api/marketplace/purchases/wallet', {
    wallet: '0x0000000000000000000000000000000000000000',
  });

  // Print results
  const results = [tokenResult, walletResult];

  for (const result of results) {
    console.log(`Endpoint: ${result.endpoint}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Configured: ${result.configured}`);
    console.log(`  Error: ${result.error || '(none)'}`);
    console.log(`  Preview: ${result.preview}`);
    console.log('');
  }

  // Summary
  console.log('========================================');
  console.log('Summary');
  console.log('========================================');

  const allOk = results.every(
    (r) => r.status === 503 || r.status === 200
  );

  if (allOk) {
    const configured = results.some((r) => r.configured !== false);
    if (configured) {
      console.log('All routes responding. Marketplace IS configured.');
    } else {
      console.log('All routes responding with 503. Marketplace NOT configured (expected in dev).');
    }
  } else {
    console.log('ERROR: Some routes failed unexpectedly.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
