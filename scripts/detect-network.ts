/**
 * Script to detect GunzChain network information
 * Run with: npx ts-node scripts/detect-network.ts
 */

import { ethers } from 'ethers';

async function detectNetwork() {
  console.log('🔍 Detecting GunzChain Network Information...\n');

  // Mainnet RPC
  const mainnetRPC = process.env.AVALANCHE_RPC_URL ||
    'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';

  console.log('📡 Mainnet RPC:', mainnetRPC);

  try {
    const provider = new ethers.JsonRpcProvider(mainnetRPC);

    console.log('\n⏳ Fetching network details...');

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();

    console.log('\n✅ MAINNET INFORMATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Chain ID: ${network.chainId}`);
    console.log(`Chain Name: ${network.name}`);
    console.log(`Current Block: ${blockNumber}`);
    console.log(`Gas Price: ${gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : 'N/A'} gwei`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Try testnet if URL provided
    console.log('🧪 Attempting to detect testnet...');
    console.log('❌ Testnet RPC URL not configured');
    console.log('💡 To detect testnet, add TESTNET_RPC_URL to .env.local');

  } catch (error) {
    console.error('❌ Error detecting network:', error);
  }
}

detectNetwork();
