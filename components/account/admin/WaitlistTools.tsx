'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { detectChain } from '@/lib/utils/detectChain';
import { truncateAddress } from './utils';

interface WaitlistAdminEntry {
  id: string;
  address: string;
  status: string;
  referralCount: number;
  promotionThreshold: number;
  createdAt: string;
  referrer?: { slug: string; slugType: string } | null;
}

interface WaitlistAdminStats {
  totalWaiting: number;
  totalPromoted: number;
  totalManualPromoted: number;
}

export function WaitlistTools({ adminSecret }: { adminSecret: string }) {
  const [entries, setEntries] = useState<WaitlistAdminEntry[]>([]);
  const [stats, setStats] = useState<WaitlistAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promoteAddress, setPromoteAddress] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/waitlist?status=waiting&limit=100', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      setEntries(data.entries ?? []);
      setStats(data.stats ?? null);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleBanWaitlist = useCallback(async (address: string) => {
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

  const handlePromote = useCallback(async (address: string) => {
    setPromotingId(address);
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Promoted ${truncateAddress(address)}`);
        fetchList();
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setPromotingId(null);
    }
  }, [headers, fetchList]);

  const handleManualPromote = useCallback(async () => {
    if (!promoteAddress.trim()) return;
    setIsPromoting(true);
    await handlePromote(promoteAddress.trim());
    setPromoteAddress('');
    setIsPromoting(false);
  }, [promoteAddress, handlePromote]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Toolbar ── */}
      <div className="shrink-0 pb-3 mb-3 border-b border-white/[0.06] space-y-2">
        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0">
            <WalletAddressInput
              value={promoteAddress}
              onChange={setPromoteAddress}
              placeholder="0x... address to promote"
              className="px-3 py-1.5 text-data bg-[var(--gs-dark-3)] placeholder:text-[var(--gs-gray-4)]"
              showHint={false}
            />
          </div>
          <button
            onClick={handleManualPromote}
            disabled={!promoteAddress.trim() || !detectChain(promoteAddress) || isPromoting}
            className="shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider border border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/5 hover:bg-[var(--gs-lime)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Promote
          </button>
        </div>
        {stats && (
          <div className="flex gap-4">
            <span className="font-mono text-data text-[var(--gs-warning)]">
              {stats.totalWaiting} waiting
            </span>
            <span className="font-mono text-data text-[var(--gs-lime)]">
              {stats.totalPromoted} auto
            </span>
            <span className="font-mono text-data text-[var(--gs-purple)]">
              {stats.totalManualPromoted} manual
            </span>
          </div>
        )}
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : entries.length === 0 ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No waiting entries</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-data text-[var(--gs-white)] tabular-nums truncate" title={entry.address}>
                  {entry.address.startsWith('email:') ? entry.address.slice(6) : truncateAddress(entry.address)}
                </span>
                {entry.referrer?.slug && (
                  <span className={`font-mono text-caption shrink-0 ${
                    entry.referrer.slugType === 'custom' ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)]'
                  }`}>
                    {entry.referrer.slug}
                  </span>
                )}
                <span className="font-mono text-caption text-[var(--gs-gray-3)] shrink-0">
                  {entry.referralCount}/{entry.promotionThreshold}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handlePromote(entry.address)}
                  disabled={promotingId === entry.address}
                  className="px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-lime)] hover:bg-[var(--gs-lime)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {promotingId === entry.address ? '...' : 'Promote'}
                </button>
                <button
                  onClick={() => handleBanWaitlist(entry.address)}
                  disabled={banningId === entry.address}
                  className="px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-loss)] hover:bg-[var(--gs-loss)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Ban (hard block)"
                >
                  Ban
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
