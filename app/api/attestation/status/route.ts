import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const GUNZCHAIN_RPC = 'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';
const CCHAIN_RPC = 'https://avalanche-c-chain-rpc.publicnode.com';
const DEPLOYER_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ?? '';
const ATTESTATION_CONTRACT = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '';

export async function GET() {
  const gunzProvider = new ethers.JsonRpcProvider(GUNZCHAIN_RPC);
  const cChainProvider = new ethers.JsonRpcProvider(CCHAIN_RPC);
  const result: {
    deployerBalance: string | null;
    deployerAvaxBalance: string | null;
    totalAttestations: number | null;
    contractAvaxBalance: string | null;
    attestFee: string | null;
    handleChangeFee: string | null;
  } = {
    deployerBalance: null,
    deployerAvaxBalance: null,
    totalAttestations: null,
    contractAvaxBalance: null,
    attestFee: null,
    handleChangeFee: null,
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
        [
          'function totalAttestations() view returns (uint256)',
          'function attestFee() view returns (uint256)',
          'function handleChangeFee() view returns (uint256)',
        ],
        cChainProvider,
      );
      const [total, fee, handleFee, balance] = await Promise.all([
        contract.totalAttestations(),
        contract.attestFee(),
        contract.handleChangeFee().catch(() => null),
        cChainProvider.getBalance(ATTESTATION_CONTRACT),
      ]);
      result.totalAttestations = Number(total);
      result.contractAvaxBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      result.attestFee = parseFloat(ethers.formatEther(fee)).toFixed(4);
      if (handleFee !== null) {
        result.handleChangeFee = parseFloat(ethers.formatEther(handleFee)).toFixed(4);
      }
    }
  } catch {
    // Contract not deployed or wrong address — leave null
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
