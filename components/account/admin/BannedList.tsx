'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { truncateAddress } from './utils';

interface BanAdminEntry {
  id: string;
  address: string;
  reason: string | null;
  bannedBy: string;
  createdAt: string;
}

export function BannedList({ adminSecret }: { adminSecret: string }) {
  const [entries, setEntries] = useState<BanAdminEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whitelist?view=banned&limit=100', {
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

  const handleUnban = useCallback(async (address: string) => {
    if (!confirm(`Unban "${address.startsWith('email:') ? address.slice(6) : address}"? They can re\u2011join the waitlist.`)) return;
    setUnbanningId(address);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ address, action: 'unban' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Unbanned ${address.startsWith('email:') ? address.slice(6) : truncateAddress(address)}`);
        fetchList();
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUnbanningId(null);
    }
  }, [headers, fetchList]);

  if (isLoading) {
    return <p className="font-mono text-caption text-[var(--gs-gray-3)] py-2 text-center">Loading&hellip;</p>;
  }

  if (total === 0) {
    return <p className="font-mono text-caption text-[var(--gs-gray-3)] py-2 text-center">No banned users</p>;
  }

  return (
    <div>
      <div className="overflow-y-auto max-h-40">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-data text-[var(--gs-loss)] tabular-nums truncate" title={entry.address}>
                {entry.address.startsWith('email:') ? entry.address.slice(6) : truncateAddress(entry.address)}
              </span>
              {entry.reason && (
                <span className="font-mono text-caption text-[var(--gs-gray-3)] shrink-0 truncate max-w-[80px]" title={entry.reason}>
                  {entry.reason}
                </span>
              )}
            </div>
            <button
              onClick={() => handleUnban(entry.address)}
              disabled={unbanningId === entry.address}
              className="px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-profit)] hover:bg-[var(--gs-profit)]/10 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              Unban
            </button>
          </div>
        ))}
      </div>
      <p className="pt-1 font-mono text-[9px] text-[var(--gs-gray-3)]">
        {total} banned
      </p>
    </div>
  );
}
