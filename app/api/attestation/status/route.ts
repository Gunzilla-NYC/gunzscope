import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const GUNZCHAIN_RPC = 'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';
const DEPLOYER_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ?? '';
const ATTESTATION_CONTRACT = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '';

export async function GET() {
  const provider = new ethers.JsonRpcProvider(GUNZCHAIN_RPC);
  const result: { deployerBalance: string | null; totalAttestations: number | null } = {
    deployerBalance: null,
    totalAttestations: null,
  };

  try {
    if (DEPLOYER_ADDRESS) {
      const balance = await provider.getBalance(DEPLOYER_ADDRESS);
      result.deployerBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
    }
  } catch {
    // RPC failure — leave null
  }

  try {
    if (ATTESTATION_CONTRACT) {
      const contract = new ethers.Contract(
        ATTESTATION_CONTRACT,
        ['function totalAttestations() view returns (uint256)'],
        provider,
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
