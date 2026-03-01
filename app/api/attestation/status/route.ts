import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const GUNZCHAIN_RPC = 'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';
const CCHAIN_RPC = 'https://avalanche-c-chain-rpc.publicnode.com';
const DEPLOYER_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ?? '';
const ATTESTATION_CONTRACT = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '';

export async function GET() {
  const gunzProvider = new ethers.JsonRpcProvider(GUNZCHAIN_RPC);
  const cChainProvider = new ethers.JsonRpcProvider(CCHAIN_RPC);
  const result: { deployerBalance: string | null; deployerAvaxBalance: string | null; totalAttestations: number | null } = {
    deployerBalance: null,
    deployerAvaxBalance: null,
    totalAttestations: null,
  };

  try {
    if (DEPLOYER_ADDRESS) {
      const balance = await gunzProvider.getBalance(DEPLOYER_ADDRESS);
      result.deployerBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
    }
  } catch {
    // RPC failure — leave null
  }

  try {
    if (DEPLOYER_ADDRESS) {
      const balance = await cChainProvider.getBalance(DEPLOYER_ADDRESS);
      result.deployerAvaxBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
    }
  } catch {
    // RPC failure — leave null
  }

  try {
    if (ATTESTATION_CONTRACT) {
      const contract = new ethers.Contract(
        ATTESTATION_CONTRACT,
        ['function totalAttestations() view returns (uint256)'],
        cChainProvider,
      );
      const total = await contract.totalAttestations();
      result.totalAttestations = Number(total);
    }
  } catch {
    // Contract not deployed or wrong address — leave null
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
