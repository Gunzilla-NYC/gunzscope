'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { detectChain } from '@/lib/utils/detectChain';
import { truncateAddress } from './utils';

interface WhitelistEntry {
  id: string;
  address: string;
  label: string | null;
  addedAt: string;
}

export function WhitelistTools({ adminSecret }: { adminSecret: string }) {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const addressChain = detectChain(newAddress);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whitelist?limit=100', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleAdd = useCallback(async () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    if (!detectChain(trimmed)) {
      toast.error('Invalid address. Enter a valid GunzChain (0x\u2026) or Solana address.');
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ address: newAddress.trim(), label: newLabel.trim() || undefined }),
      });
      const data = await res.json();
      if (data.entry) {
        toast.success(`Added ${truncateAddress(newAddress.trim())}`);
        setNewAddress('');
        setNewLabel('');
        fetchList();
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsAdding(false);
    }
  }, [newAddress, newLabel, headers, fetchList]);

  const handleRemove = useCallback(async (address: string) => {
    const display = address.startsWith('email:') ? address.slice(6) : address;
    if (!confirm(`Remove "${display}" from the whitelist?\n\nThis will:\n\u2022 Revoke their early access immediately\n\u2022 Reset any waitlist promotion progress\n\u2022 They can re\u2011join the waitlist but start from zero`)) return;
    setRemovingId(address);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Removed ${address.startsWith('email:') ? address.slice(6) : truncateAddress(address)}`);
        fetchList();
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRemovingId(null);
    }
  }, [headers, fetchList]);

  const handleBan = useCallback(async (address: string) => {
    if (!confirm(`Ban "${address.startsWith('email:') ? address.slice(6) : address}"? They will be removed and cannot re\u2011enroll.`)) return;
    setBanningId(address);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ address, action: 'ban' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Banned ${address.startsWith('email:') ? address.slice(6) : truncateAddress(address)}`);
        fetchList();
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBanningId(null);
    }
  }, [headers, fetchList]);

  const handleReset = useCallback(async (address: string) => {
    if (!confirm(`Reset "${address.startsWith('email:') ? address.slice(6) : address}"? Whitelist + waitlist data cleared. They can re\u2011join fresh.`)) return;
    setBanningId(address);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ address, action: 'reset' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reset ${address.startsWith('email:') ? address.slice(6) : truncateAddress(address)}`);
        fetchList();
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBanningId(null);
    }
  }, [headers, fetchList]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Toolbar ── */}
      <div className="shrink-0 pb-3 mb-3 border-b border-white/[0.06] space-y-2">
        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0">
            <WalletAddressInput
              value={newAddress}
              onChange={setNewAddress}
              className="px-3 py-1.5 text-data bg-[var(--gs-dark-3)] placeholder:text-[var(--gs-gray-4)]"
              showHint={false}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newAddress.trim() || !addressChain || isAdding}
            className="shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider border border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/5 hover:bg-[var(--gs-lime)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {isAdding ? '+' : 'Add'}
          </button>
        </div>
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Label (optional)"
          className="w-full px-3 py-1.5 font-mono text-data text-[var(--gs-white)] bg-[var(--gs-dark-3)] border border-white/[0.08] outline-none placeholder:text-[var(--gs-gray-4)] focus:border-[var(--gs-lime)]/30"
        />
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : entries.length === 0 ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No entries</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-data text-[var(--gs-white)] tabular-nums truncate" title={entry.address}>
                  {entry.address.startsWith('email:') ? entry.address.slice(6) : truncateAddress(entry.address)}
                </span>
                {entry.label && (
                  <span className="font-mono text-caption text-[var(--gs-gray-3)] shrink-0">{entry.label}</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleReset(entry.address)}
                  disabled={banningId === entry.address}
                  className="px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-warning)] hover:bg-[var(--gs-warning)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Reset (soft remove, can re-join)"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleBan(entry.address)}
                  disabled={banningId === entry.address}
                  className="px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-loss)] hover:bg-[var(--gs-loss)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Ban (hard block, cannot re-enroll)"
                >
                  Ban
                </button>
                <button
                  onClick={() => handleRemove(entry.address)}
                  disabled={removingId === entry.address}
                  className="p-1 text-[var(--gs-gray-2)] hover:text-[var(--gs-loss)] transition-colors disabled:opacity-50"
                  aria-label="Remove"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="shrink-0 pt-2 font-mono text-[9px] text-[var(--gs-gray-3)]">
        {total} whitelisted address{total !== 1 ? 'es' : ''}
      </p>
    </div>
  );
}
