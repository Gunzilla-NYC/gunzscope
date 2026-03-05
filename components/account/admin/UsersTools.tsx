'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { truncateAddress } from './utils';

interface UserEntry {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
  wallets: { address: string; chain: string; isPrimary: boolean }[];
  counts: {
    shareLinks: number;
    featureRequests: number;
    trackedAddresses: number;
    favorites: number;
  };
  whitelisted: boolean;
}

export function UsersTools({ adminSecret }: { adminSecret: string }) {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchUsers = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (query) params.set('search', query);
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(value.trim() || undefined);
    }, 350);
  }, [fetchUsers]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 p-5">
      {/* Search bar */}
      <div className="shrink-0 pb-3 mb-3 border-b border-white/[0.06]">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name, email, or wallet address\u2026"
          className="w-full max-w-md px-3 py-1.5 font-mono text-data text-[var(--gs-white)] bg-[var(--gs-dark-3)] border border-white/[0.08] outline-none placeholder:text-[var(--gs-gray-4)] focus:border-[var(--gs-lime)]/30"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : users.length === 0 ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">
          {search ? 'No users match search' : 'No registered users'}
        </p>
      ) : (
        <>
          {/* Header row */}
          <div className="shrink-0 grid grid-cols-[1fr_160px_80px_60px_60px_60px_60px] gap-2 pb-2 mb-1 border-b border-white/[0.06]">
            {['User', 'Wallet', 'Chain', 'Shares', 'Reqs', 'Favs', 'Joined'].map((h) => (
              <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-2)]">
                {h}
              </span>
            ))}
          </div>

          {/* User rows */}
          <div className="flex-1 overflow-y-auto">
            {users.map((user) => {
              const primary = user.wallets.find((w) => w.isPrimary) ?? user.wallets[0];
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_160px_80px_60px_60px_60px_60px] gap-2 items-center py-2 border-b border-white/[0.06] last:border-b-0"
                >
                  {/* Name + whitelist badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    {user.whitelisted && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--gs-lime)]"
                        title="Whitelisted"
                      />
                    )}
                    <span className="font-mono text-data text-[var(--gs-white)] truncate">
                      {user.displayName || user.email || (primary ? truncateAddress(primary.address) : 'Anonymous')}
                    </span>
                    {user.wallets.length > 1 && (
                      <span className="font-mono text-caption text-[var(--gs-gray-2)] shrink-0">
                        {user.wallets.length}w
                      </span>
                    )}
                  </div>

                  {/* Primary wallet */}
                  <span
                    className="font-mono text-data text-[var(--gs-gray-4)] tabular-nums truncate"
                    title={primary?.address}
                  >
                    {primary ? truncateAddress(primary.address) : '\u2014'}
                  </span>

                  {/* Chain */}
                  <span className="font-mono text-caption text-[var(--gs-gray-3)] uppercase">
                    {primary?.chain ?? '\u2014'}
                  </span>

                  {/* Shares */}
                  <span className={`font-mono text-data tabular-nums ${user.counts.shareLinks > 0 ? 'text-[var(--gs-purple)]' : 'text-[var(--gs-gray-2)]'}`}>
                    {user.counts.shareLinks}
                  </span>

                  {/* Feature requests */}
                  <span className={`font-mono text-data tabular-nums ${user.counts.featureRequests > 0 ? 'text-[var(--gs-warning)]' : 'text-[var(--gs-gray-2)]'}`}>
                    {user.counts.featureRequests}
                  </span>

                  {/* Favorites */}
                  <span className={`font-mono text-data tabular-nums ${user.counts.favorites > 0 ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-2)]'}`}>
                    {user.counts.favorites}
                  </span>

                  {/* Joined date */}
                  <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <p className="shrink-0 pt-2 font-mono text-[9px] text-[var(--gs-gray-3)]">
        {total} registered user{total !== 1 ? 's' : ''}
        {search && ` matching "${search}"`}
      </p>
    </div>
  );
}
