'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { truncateAddress } from './utils';

interface LookupResult {
  found: boolean;
  slug?: string;
  slugType?: string;
  customSlug?: string | null;
  slugChangesRemaining?: number;
  walletAddress?: string;
}

export function HandleTools({ adminSecret }: { adminSecret: string }) {
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
