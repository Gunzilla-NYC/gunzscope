'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

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
      <input
        type="text"
        value={input}
        onChange={e => handleInputChange(e.target.value)}
        placeholder="0x... wallet address or slug"
        className={`w-full px-3 py-2 font-mono text-data text-[var(--gs-white)] bg-[var(--gs-dark-3)] border outline-none placeholder:text-[var(--gs-gray-4)] ${
          lookup?.found ? 'border-[var(--gs-profit)]/40' :
          lookup && !lookup.found ? 'border-[var(--gs-loss)]/40' :
          'border-white/[0.08] focus:border-[var(--gs-lime)]/30'
        }`}
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

type TabMode = 'views' | 'shares' | 'portfolios';

function ShareLeaderboard({ adminSecret }: { adminSecret: string }) {
  const [byViews, setByViews] = useState<LeaderboardEntry[]>([]);
  const [byShares, setByShares] = useState<LeaderboardEntry[]>([]);
  const [topPortfolios, setTopPortfolios] = useState<TopPortfolioEntry[]>([]);
  const [tab, setTab] = useState<TabMode>('views');
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

  const tabConfig: { key: TabMode; label: string; color: string }[] = [
    { key: 'views', label: 'Views', color: 'var(--gs-lime)' },
    { key: 'shares', label: 'Shares', color: 'var(--gs-purple)' },
    { key: 'portfolios', label: 'Portfolios', color: 'var(--gs-warning)' },
  ];

  const rankColor = (i: number) =>
    i === 0 ? 'text-[var(--gs-lime)]' : i === 1 ? 'text-[var(--gs-purple)]' : i === 2 ? 'text-[var(--gs-warning)]' : 'text-[var(--gs-gray-3)]';

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {tabConfig.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`font-mono text-caption uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer ${
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

      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : tab === 'portfolios' ? (
        topPortfolios.length === 0 ? (
          <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No shares yet</p>
        ) : (
          <div>
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
          <div>
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
    if (!newAddress.trim()) return;
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
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newAddress}
          onChange={e => setNewAddress(e.target.value)}
          placeholder="0x... address"
          className="flex-1 px-3 py-2 font-mono text-data text-[var(--gs-white)] bg-[var(--gs-dark-3)] border border-white/[0.08] outline-none placeholder:text-[var(--gs-gray-4)] focus:border-[var(--gs-lime)]/30"
        />
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Label"
          className="w-28 px-3 py-2 font-mono text-data text-[var(--gs-white)] bg-[var(--gs-dark-3)] border border-white/[0.08] outline-none placeholder:text-[var(--gs-gray-4)] focus:border-[var(--gs-lime)]/30"
        />
        <button
          onClick={handleAdd}
          disabled={!newAddress.trim() || isAdding}
          className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider border border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/5 hover:bg-[var(--gs-lime)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {isAdding ? '+' : 'Add'}
        </button>
      </div>

      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : entries.length === 0 ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No entries</p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
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

      <p className="font-mono text-[9px] text-[var(--gs-gray-3)]">
        {total} whitelisted address{total !== 1 ? 'es' : ''}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPanel
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
      {label}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-white/[0.06] my-5" />;
}

export default function AdminPanel({ adminSecret }: AdminPanelProps) {
  return (
    <section className="bg-[var(--gs-dark-2)] border border-[var(--gs-loss)]/20 overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-loss)] via-[var(--gs-warning)] to-transparent" />
      <div className="p-6">
        <SectionLabel label="UX Testing" />
        <p className="font-mono text-caption text-[var(--gs-gray-2)] mb-4">
          Simulate different user states. Reloads the page after clearing.
        </p>
        <UXTestingTools />

        <Divider />
        <SectionLabel label="Handle Tools" />
        <HandleTools adminSecret={adminSecret} />

        <Divider />
        <SectionLabel label="Share Leaderboard" />
        <ShareLeaderboard adminSecret={adminSecret} />

        <Divider />
        <SectionLabel label="Whitelist" />
        <WhitelistTools adminSecret={adminSecret} />
      </div>
    </section>
  );
}
