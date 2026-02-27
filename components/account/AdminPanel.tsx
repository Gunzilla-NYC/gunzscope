'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { detectChain } from '@/lib/utils/detectChain';

interface AdminPanelProps {
  adminSecret: string;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section: UX Testing
// ─────────────────────────────────────────────────────────────────────────────

function UXTestingTools() {
  const resets: { label: string; description: string; color: string; clear: () => void }[] = [
    {
      label: 'First\u2011Time Visitor',
      description: 'Nukes everything \u2014 onboarding, welcome, search gate, cache, history',
      color: 'var(--gs-loss)',
      clear: () => {
        localStorage.removeItem('gs-uxr-welcome-dismissed');
        localStorage.removeItem('gs-onboarding');
        localStorage.removeItem('gs_wallet_hint_dismissed');
        sessionStorage.removeItem('gs_search_count');
        sessionStorage.removeItem('gs_searched_addrs');
        sessionStorage.removeItem('gs_last_search');
        localStorage.removeItem('gunzscope:portfolio:history');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('zillascope:')) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      },
    },
    {
      label: 'New Account',
      description: 'Re\u2011triggers welcome popup, onboarding checklist & wallet hint',
      color: 'var(--gs-purple)',
      clear: () => {
        localStorage.removeItem('gs-uxr-welcome-dismissed');
        localStorage.removeItem('gs-onboarding');
        localStorage.removeItem('gs_wallet_hint_dismissed');
      },
    },
    {
      label: 'Returning User',
      description: 'Clears NFT cache & portfolio history only \u2014 keeps onboarding state',
      color: 'var(--gs-lime)',
      clear: () => {
        localStorage.removeItem('gunzscope:portfolio:history');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('zillascope:')) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      },
    },
  ];

  return (
    <div className="space-y-3">
      {resets.map(({ label, description, color, clear }) => (
        <div key={label} className="flex items-center justify-between">
          <div>
            <p className="font-mono text-data text-[var(--gs-gray-4)]">{label}</p>
            <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => {
              clear();
              toast.success(`Reset to ${label.toLowerCase()}. Reloading\u2026`);
              setTimeout(() => window.location.reload(), 800);
            }}
            className="shrink-0 px-4 py-2 font-mono text-caption uppercase tracking-wider border transition-colors cursor-pointer"
            style={{
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
              color,
            }}
          >
            Reset
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section: Handle Tools
// ─────────────────────────────────────────────────────────────────────────────

interface LookupResult {
  found: boolean;
  slug?: string;
  slugType?: string;
  customSlug?: string | null;
  slugChangesRemaining?: number;
  walletAddress?: string;
}

function HandleTools({ adminSecret }: { adminSecret: string }) {
  const [input, setInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  // Debounced lookup on input change
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setLookup(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 3) {
      setIsLooking(false);
      return;
    }

    setIsLooking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/referrals?search=${encodeURIComponent(value.trim())}`,
          { headers: { Authorization: `Bearer ${adminSecret}` } },
        );
        const data = await res.json();
        if (data.success && data.found) {
          setLookup({
            found: true,
            slug: data.referrer.slug,
            slugType: data.referrer.slugType,
            customSlug: data.referrer.customSlug,
            slugChangesRemaining: data.referrer.slugChangesRemaining,
            walletAddress: data.referrer.walletAddress,
          });
        } else {
          setLookup({ found: false });
        }
      } catch {
        setLookup(null);
      } finally {
        setIsLooking(false);
      }
    }, 400);
  }, [adminSecret]);

  const handleDelete = useCallback(async () => {
    if (!input.trim()) return;
    if (!confirm(`Delete handle for "${input}"? This removes the referrer and all events. Page will reload.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ wallet: input.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted handle for ${data.deleted.slug}. Reloading\u2026`);
        setInput('');
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsDeleting(false);
    }
  }, [input, headers]);

  const handleResetChanges = useCallback(async () => {
    if (!input.trim()) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ wallet: input.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reset slug changes for ${data.referrer.slug} (now: ${data.referrer.slugChangesRemaining}). Reloading\u2026`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsResetting(false);
    }
  }, [input, headers]);

  return (
    <div className="space-y-3">
      <WalletAddressInput
        value={input}
        onChange={handleInputChange}
        placeholder="0x... wallet address or slug"
        className="px-3 py-2 text-data bg-[var(--gs-dark-3)] placeholder:text-[var(--gs-gray-4)]"
        style={
          lookup?.found ? { borderColor: 'color-mix(in srgb, var(--gs-profit) 40%, transparent)' } :
          lookup && !lookup.found ? { borderColor: 'color-mix(in srgb, var(--gs-loss) 40%, transparent)' } :
          undefined
        }
        validateChain={false}
        showHint={false}
      />
      {/* Lookup result */}
      {isLooking && (
        <p className="font-mono text-[9px] text-[var(--gs-gray-3)]">Searching&hellip;</p>
      )}
      {lookup?.found && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] text-[var(--gs-profit)]">&#10003; Found</span>
          <span className="font-mono text-[9px] text-[var(--gs-gray-4)]">
            slug: <span className="text-[var(--gs-lime)]">{lookup.slug}</span>
          </span>
          <span className="font-mono text-[9px] text-[var(--gs-gray-4)]">
            type: <span className="text-[var(--gs-white)]">{lookup.slugType}</span>
          </span>
          <span className="font-mono text-[9px] text-[var(--gs-gray-4)]">
            changes: <span className="text-[var(--gs-white)]">{lookup.slugChangesRemaining}</span>
          </span>
          {lookup.walletAddress && (
            <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">
              {truncateAddress(lookup.walletAddress)}
            </span>
          )}
        </div>
      )}
      {lookup && !lookup.found && (
        <p className="font-mono text-[9px] text-[var(--gs-loss)]">&#10007; Not found</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={!input.trim() || isDeleting}
          className="flex-1 font-mono text-[10px] uppercase tracking-wider px-3 py-2 border border-[var(--gs-loss)]/30 text-[var(--gs-loss)] bg-[var(--gs-loss)]/5 hover:bg-[var(--gs-loss)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {isDeleting ? 'Deleting\u2026' : 'Delete Handle'}
        </button>
        <button
          onClick={handleResetChanges}
          disabled={!input.trim() || isResetting}
          className="flex-1 font-mono text-[10px] uppercase tracking-wider px-3 py-2 border border-[var(--gs-warning)]/30 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5 hover:bg-[var(--gs-warning)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {isResetting ? 'Resetting\u2026' : 'Reset Slug Changes'}
        </button>
      </div>
      <p className="font-mono text-[9px] text-[var(--gs-gray-3)]">
        Delete: removes referrer + all events (wallet can re&#8209;register).
        Reset: restores slug changes to 1.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section: Share Leaderboard
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  userProfileId: string;
  displayName: string | null;
  totalViews: number;
  shareCount: number;
}

interface TopPortfolioEntry {
  address: string;
  totalViews: number;
  shareCount: number;
}

type LeaderboardTabMode = 'views' | 'shares' | 'portfolios';

function ShareLeaderboard({ adminSecret }: { adminSecret: string }) {
  const [byViews, setByViews] = useState<LeaderboardEntry[]>([]);
  const [byShares, setByShares] = useState<LeaderboardEntry[]>([]);
  const [topPortfolios, setTopPortfolios] = useState<TopPortfolioEntry[]>([]);
  const [tab, setTab] = useState<LeaderboardTabMode>('views');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/admin/shares', {
          headers: { Authorization: `Bearer ${adminSecret}` },
        });
        const data = await res.json();
        if (data.success) {
          setByViews(data.byViews ?? []);
          setByShares(data.byShares ?? []);
          setTopPortfolios(data.topPortfolios ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, [adminSecret]);

  const tabConfig: { key: LeaderboardTabMode; label: string; color: string }[] = [
    { key: 'views', label: 'Views', color: 'var(--gs-lime)' },
    { key: 'shares', label: 'Shares', color: 'var(--gs-purple)' },
    { key: 'portfolios', label: 'Portfolios', color: 'var(--gs-warning)' },
  ];

  const rankColor = (i: number) =>
    i === 0 ? 'text-[var(--gs-lime)]' : i === 1 ? 'text-[var(--gs-purple)]' : i === 2 ? 'text-[var(--gs-warning)]' : 'text-[var(--gs-gray-3)]';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Toolbar ── */}
      <div className="shrink-0 pb-3 mb-3 border-b border-white/[0.06]">
        <div className="flex gap-1">
          {tabConfig.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`font-mono text-caption uppercase tracking-wider px-2.5 py-1.5 border transition-colors cursor-pointer ${
                tab === key ? '' : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:bg-white/[0.04]'
              }`}
              style={tab === key ? {
                borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                color,
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
              } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : tab === 'portfolios' ? (
        topPortfolios.length === 0 ? (
          <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No shares yet</p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {topPortfolios.map((entry, i) => (
              <div key={entry.address} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono text-sm font-bold tabular-nums w-6 text-right shrink-0 ${rankColor(i)}`}>
                    #{i + 1}
                  </span>
                  <a
                    href={`/portfolio?address=${entry.address}`}
                    className="font-mono text-sm text-[var(--gs-white)] hover:text-[var(--gs-lime)] transition-colors truncate"
                    title={entry.address}
                  >
                    {truncateAddress(entry.address)}
                  </a>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-data tabular-nums text-[var(--gs-purple)]">{entry.totalViews}v</span>
                  <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">{entry.shareCount}s</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (() => {
        const entries = tab === 'views' ? byViews : byShares;
        return entries.length === 0 ? (
          <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No shares yet</p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {entries.map((entry, i) => (
              <div key={entry.userProfileId} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono text-sm font-bold tabular-nums w-6 text-right shrink-0 ${rankColor(i)}`}>
                    #{i + 1}
                  </span>
                  <span className="font-body text-sm text-[var(--gs-white)] truncate">
                    {entry.displayName || entry.userProfileId.slice(0, 12) + '\u2026'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-data tabular-nums text-[var(--gs-purple)]">{entry.totalViews}v</span>
                  <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">{entry.shareCount}s</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section: Whitelist Tools
// ─────────────────────────────────────────────────────────────────────────────

interface WhitelistEntry {
  id: string;
  address: string;
  label: string | null;
  addedAt: string;
}

function WhitelistTools({ adminSecret }: { adminSecret: string }) {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
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
    setRemovingId(address);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Removed ${truncateAddress(address)}`);
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
                <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">
                  {truncateAddress(entry.address)}
                </span>
                {entry.label && (
                  <span className="font-mono text-caption text-[var(--gs-gray-3)] truncate">{entry.label}</span>
                )}
              </div>
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
          ))}
        </div>
      )}

      <p className="shrink-0 pt-2 font-mono text-[9px] text-[var(--gs-gray-3)]">
        {total} whitelisted address{total !== 1 ? 'es' : ''}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-section: Waitlist
// ─────────────────────────────────────────────────────────────────────────────

interface WaitlistAdminEntry {
  id: string;
  address: string;
  status: string;
  referralCount: number;
  promotionThreshold: number;
  createdAt: string;
}

interface WaitlistAdminStats {
  totalWaiting: number;
  totalPromoted: number;
  totalManualPromoted: number;
}

function WaitlistTools({ adminSecret }: { adminSecret: string }) {
  const [entries, setEntries] = useState<WaitlistAdminEntry[]>([]);
  const [stats, setStats] = useState<WaitlistAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promoteAddress, setPromoteAddress] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

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
                <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">
                  {truncateAddress(entry.address)}
                </span>
                <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                  {entry.referralCount}/{entry.promotionThreshold}
                </span>
              </div>
              <button
                onClick={() => handlePromote(entry.address)}
                disabled={promotingId === entry.address}
                className="px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-lime)] hover:bg-[var(--gs-lime)]/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {promotingId === entry.address ? '...' : 'Promote'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column label
// ─────────────────────────────────────────────────────────────────────────────

function ColumnLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3 pb-2 border-b border-white/[0.06]">
      {label}
    </p>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
      {label}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPanel — tabbed layout
// ─────────────────────────────────────────────────────────────────────────────

type AdminTab = 'manage' | 'tools' | 'links';

const ADMIN_LINKS: { href: string; label: string; description: string; color: string }[] = [
  { href: '/brand', label: 'Brand Guidelines', description: 'Colors, typography, components, design system', color: 'var(--gs-purple)' },
  { href: '/strategy', label: 'Strategic Roadmap', description: '6-phase product roadmap \u2014 Build Games 2026', color: 'var(--gs-lime)' },
  { href: '/roadmap', label: 'Architecture Doc', description: 'On-chain strategy, deployment plan, system design', color: 'var(--gs-warning)' },
  { href: '/changelog', label: 'Changelog', description: 'Technical release notes (public)', color: 'var(--gs-gray-4)' },
  { href: '/updates', label: 'Updates', description: 'User-facing release notes (public)', color: 'var(--gs-gray-4)' },
];

export default function AdminPanel({ adminSecret }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('manage');

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'manage', label: 'Whitelist / Waitlist / Leaderboard' },
    { key: 'tools', label: 'Tools' },
    { key: 'links', label: 'Links' },
  ];

  return (
    <section className="bg-[var(--gs-dark-2)] border border-[var(--gs-loss)]/20 overflow-hidden flex flex-col h-full">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-loss)] via-[var(--gs-warning)] to-transparent shrink-0" />

      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06] shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 sm:flex-none px-5 py-3 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === key
                ? 'text-[var(--gs-loss)] bg-[var(--gs-loss)]/[0.06] border-b-2 border-[var(--gs-loss)]'
                : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-gray-4)] hover:bg-white/[0.02]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Manage tab — 3-column layout */}
      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] flex-1 min-h-0">
          <div className="p-5 flex flex-col min-h-0">
            <ColumnLabel label="Whitelist" />
            <WhitelistTools adminSecret={adminSecret} />
          </div>
          <div className="p-5 flex flex-col min-h-0">
            <ColumnLabel label="Waitlist" />
            <WaitlistTools adminSecret={adminSecret} />
          </div>
          <div className="p-5 flex flex-col min-h-0">
            <ColumnLabel label="Share Leaderboard" />
            <ShareLeaderboard adminSecret={adminSecret} />
          </div>
        </div>
      )}

      {/* Tools tab — UX Testing + Handle Tools side by side */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] flex-1 min-h-0">
          <div className="p-5">
            <SectionLabel label="UX Testing" />
            <p className="font-mono text-caption text-[var(--gs-gray-2)] mb-4">
              Simulate different user states. Reloads the page after clearing.
            </p>
            <UXTestingTools />
          </div>
          <div className="p-5">
            <SectionLabel label="Handle Tools" />
            <HandleTools adminSecret={adminSecret} />
          </div>
        </div>
      )}

      {/* Links tab — admin-only page links */}
      {activeTab === 'links' && (
        <div className="p-5 flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ADMIN_LINKS.map(({ href, label, description, color }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-1 p-4 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-data uppercase tracking-wider text-[var(--gs-white)] group-hover:text-[var(--gs-lime)] transition-colors">
                    {label}
                  </span>
                </div>
                <p className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                  {description}
                </p>
                <span className="font-mono text-[9px] text-[var(--gs-gray-2)] mt-1">{href}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
