'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ensureAvalancheChain, getSignerFromProvider, withdrawFees, getContractAddress, ATTESTATION_ABI } from '@/lib/attestation/contract';
import { ethers } from 'ethers';
import { truncateAddress } from './utils';

const DEPLOYER_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ?? '';
const ATTESTATION_CONTRACT = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '';
const GUNZCHAIN_EXPLORER = 'https://gunzscan.io';

interface OnChainInfo {
  deployerBalance: string | null;
  deployerAvaxBalance: string | null;
  totalAttestations: number | null;
  contractAvaxBalance: string | null;
  attestFee: string | null;
  handleChangeFee: string | null;
  loading: boolean;
}

type WithdrawStatus = 'idle' | 'switching' | 'signing' | 'confirming' | 'success' | 'error';

export function OnChainTools() {
  const [info, setInfo] = useState<OnChainInfo>({ deployerBalance: null, deployerAvaxBalance: null, totalAttestations: null, contractAvaxBalance: null, attestFee: null, handleChangeFee: null, loading: false });
  const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus>('idle');
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
  const [newHandleFee, setNewHandleFee] = useState('');
  const [handleFeeStatus, setHandleFeeStatus] = useState<'idle' | 'signing' | 'confirming' | 'success' | 'error'>('idle');

  const { primaryWallet } = useDynamicContext();
  const walletProvider = useMemo(() => {
    if (!primaryWallet?.connector) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (primaryWallet.connector as any).getWalletClient?.() ?? null;
    } catch {
      return null;
    }
  }, [primaryWallet]);

  const fetchInfo = useCallback(async () => {
    setInfo(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/attestation/status');
      const data = await res.json();
      setInfo({
        deployerBalance: data.deployerBalance ?? null,
        deployerAvaxBalance: data.deployerAvaxBalance ?? null,
        totalAttestations: data.totalAttestations ?? null,
        contractAvaxBalance: data.contractAvaxBalance ?? null,
        attestFee: data.attestFee ?? null,
        handleChangeFee: data.handleChangeFee ?? null,
        loading: false,
      });
    } catch {
      setInfo(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const handleWithdraw = useCallback(async () => {
    if (!walletProvider) {
      toast.error('No wallet connected');
      return;
    }
    try {
      setWithdrawStatus('switching');
      await ensureAvalancheChain(walletProvider);

      setWithdrawStatus('signing');
      const signer = await getSignerFromProvider(walletProvider);

      setWithdrawStatus('confirming');
      const { txHash } = await withdrawFees(signer);
      setWithdrawTxHash(txHash);
      setWithdrawStatus('success');
      toast.success('Withdrawal confirmed');

      // Refresh balances
      fetchInfo();
    } catch (err: unknown) {
      setWithdrawStatus('error');
      const msg = err instanceof Error ? err.message : 'Withdrawal failed';
      if (msg.includes('Not owner')) {
        toast.error('Connected wallet is not the contract owner');
      } else if (msg.includes('user rejected') || msg.includes('User denied')) {
        toast.error('Transaction cancelled');
        setWithdrawStatus('idle');
      } else {
        toast.error(msg);
      }
    }
  }, [walletProvider, fetchInfo]);

  const handleUpdateHandleFee = useCallback(async () => {
    if (!walletProvider || !newHandleFee) return;
    try {
      setHandleFeeStatus('signing');
      await ensureAvalancheChain(walletProvider);
      const signer = await getSignerFromProvider(walletProvider);
      const contract = new ethers.Contract(getContractAddress(), ATTESTATION_ABI, signer);

      setHandleFeeStatus('confirming');
      const tx = await contract.setHandleChangeFee(ethers.parseEther(newHandleFee));
      await tx.wait();

      setHandleFeeStatus('success');
      toast.success(`Handle change fee updated to ${newHandleFee} AVAX`);
      setNewHandleFee('');
      fetchInfo();
    } catch (err: unknown) {
      setHandleFeeStatus('error');
      const msg = err instanceof Error ? err.message : 'Failed to update fee';
      if (msg.includes('user rejected') || msg.includes('User denied')) {
        toast.error('Transaction cancelled');
        setHandleFeeStatus('idle');
      } else {
        toast.error(msg);
      }
    }
  }, [walletProvider, newHandleFee, fetchInfo]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  }, []);

  const entries: { label: string; value: string; explorerPath?: string; color: string }[] = [
    {
      label: 'Deployer Wallet',
      value: DEPLOYER_ADDRESS,
      explorerPath: DEPLOYER_ADDRESS ? `/address/${DEPLOYER_ADDRESS}` : undefined,
      color: 'var(--gs-warning)',
    },
    {
      label: 'Attestation Contract',
      value: ATTESTATION_CONTRACT,
      explorerPath: ATTESTATION_CONTRACT ? `/address/${ATTESTATION_CONTRACT}` : undefined,
      color: 'var(--gs-lime)',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Network info */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)] shrink-0" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)]">
          GunzChain Mainnet
        </span>
        <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">
          Chain ID 43419
        </span>
      </div>

      {/* Addresses */}
      {entries.map(({ label, value, explorerPath, color }) => (
        <div key={label} className="space-y-1">
          <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color }}>
            {label}
          </p>
          {value ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => copyToClipboard(value, label.toLowerCase())}
                className="font-mono text-data text-[var(--gs-white)] hover:text-[var(--gs-lime)] transition-colors cursor-pointer truncate text-left"
                title={value}
              >
                {truncateAddress(value)}
              </button>
              {explorerPath && (
                <a
                  href={`${GUNZCHAIN_EXPLORER}${explorerPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors shrink-0"
                  title="View on GunzScan"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          ) : (
            <p className="font-mono text-[9px] text-[var(--gs-gray-2)] italic">Not configured</p>
          )}
        </div>
      ))}

      {/* Live status */}
      <div className="pt-3 border-t border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)]">
            Live Status
          </span>
          <button
            onClick={fetchInfo}
            disabled={info.loading || (!DEPLOYER_ADDRESS && !ATTESTATION_CONTRACT)}
            className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {info.loading ? 'Checking\u2026' : 'Check'}
          </button>
        </div>

        {info.deployerBalance !== null && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Deployer Balance</span>
            <span className="font-mono text-data tabular-nums text-[var(--gs-warning)]">
              {info.deployerBalance} GUN
            </span>
          </div>
        )}

        {info.deployerAvaxBalance !== null && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">C&#8209;Chain Balance</span>
            <span className="font-mono text-data tabular-nums text-[var(--gs-error)]">
              {info.deployerAvaxBalance} AVAX
            </span>
          </div>
        )}

        {info.totalAttestations !== null && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Total Attestations</span>
            <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">
              {info.totalAttestations}
            </span>
          </div>
        )}

        {info.contractAvaxBalance !== null && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">AVAX Earned (Contract)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-data tabular-nums text-[var(--gs-error)]">
                {info.contractAvaxBalance} AVAX
              </span>
              {parseFloat(info.contractAvaxBalance) > 0 && walletProvider && withdrawStatus !== 'success' && (
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawStatus !== 'idle'}
                  className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 border border-[var(--gs-error)]/40 text-[var(--gs-error)] hover:bg-[var(--gs-error)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  {withdrawStatus === 'idle' && 'Withdraw'}
                  {withdrawStatus === 'switching' && 'Switching\u2026'}
                  {withdrawStatus === 'signing' && 'Sign in wallet\u2026'}
                  {withdrawStatus === 'confirming' && 'Confirming\u2026'}
                  {withdrawStatus === 'error' && 'Retry'}
                </button>
              )}
            </div>
          </div>
        )}

        {withdrawStatus === 'success' && withdrawTxHash && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--gs-profit)]">Withdrawn</span>
            <a
              href={`https://snowtrace.io/tx/${withdrawTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors"
            >
              {withdrawTxHash.slice(0, 10)}\u2026{withdrawTxHash.slice(-6)}
            </a>
          </div>
        )}

        {info.attestFee !== null && (
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Attest Fee</span>
            <span className="font-mono text-data tabular-nums text-[var(--gs-gray-4)]">
              {info.attestFee} AVAX
            </span>
          </div>
        )}

        {info.handleChangeFee !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Handle Change Fee</span>
              <span className="font-mono text-data tabular-nums text-[var(--gs-gray-4)]">
                {info.handleChangeFee} AVAX
              </span>
            </div>
            {walletProvider && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newHandleFee}
                  onChange={(e) => setNewHandleFee(e.target.value)}
                  placeholder="New fee (AVAX)"
                  className="flex-1 font-mono text-[9px] bg-white/[0.04] border border-white/[0.08] px-1.5 py-1 text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] outline-none focus:border-[var(--gs-purple)]/40"
                />
                <button
                  onClick={handleUpdateHandleFee}
                  disabled={!newHandleFee || handleFeeStatus === 'signing' || handleFeeStatus === 'confirming'}
                  className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-1 border border-[var(--gs-purple)]/40 text-[var(--gs-purple)] hover:bg-[var(--gs-purple)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default shrink-0"
                >
                  {handleFeeStatus === 'idle' && 'Update'}
                  {handleFeeStatus === 'signing' && 'Sign\u2026'}
                  {handleFeeStatus === 'confirming' && 'Confirming\u2026'}
                  {handleFeeStatus === 'success' && 'Done'}
                  {handleFeeStatus === 'error' && 'Retry'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick ref */}
      <div className="pt-3 border-t border-white/[0.06]">
        <p className="font-mono text-[9px] text-[var(--gs-gray-2)] leading-relaxed">
          Deploy: <span className="text-[var(--gs-gray-4)]">cd onchain && npm run deploy:gunzchain</span>
        </p>
      </div>
    </div>
  );
}
