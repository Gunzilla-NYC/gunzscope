'use client';

import { useShareReferral, timeAgo } from '@/lib/hooks/useShareReferral';
import type { ShareSlot, SlugValidation, RecentReferral } from '@/lib/hooks/useShareReferral';
import Button from '@/components/ui/Button';
import { clipHex } from '@/lib/utils/styles';

// =============================================================================
// Constants
// =============================================================================

const METHOD_META: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
  link: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    label: 'LINK',
    description: 'Direct URL',
  },
  discord: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
    label: 'DISCORD',
    description: 'Server share',
  },
  x: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    label: 'X',
    description: 'Post on X',
  },
};

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  portfolio_loaded: {
    bg: 'rgba(0,255,136,0.1)',
    text: 'var(--gs-profit)',
    border: 'rgba(0,255,136,0.2)',
    label: 'CONVERTED',
  },
  wallet_connected: {
    bg: 'rgba(109,91,255,0.1)',
    text: 'var(--gs-purple)',
    border: 'rgba(109,91,255,0.2)',
    label: 'CONNECTED',
  },
};

// =============================================================================
// Sub-components
// =============================================================================

function ValidationMessage({ status, message }: { status: string; message?: string }) {
  if (status === 'idle') return null;

  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--gs-gray-3)]">
        <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
          <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Checking&hellip;
      </span>
    );
  }

  if (status === 'available') {
    return (
      <span className="font-mono text-[10px] text-[var(--gs-lime)]">
        &#10003; Available
      </span>
    );
  }

  if (status === 'taken' || status === 'reserved') {
    return (
      <span className="font-mono text-[10px] text-[var(--gs-loss)]">
        &#10007; {message ?? 'Unavailable'}
      </span>
    );
  }

  return (
    <span className="font-mono text-[10px] text-[var(--gs-gray-3)]">
      {message ?? '3\u201320 chars, lowercase + hyphens'}
    </span>
  );
}

function StatCell({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-r border-white/[0.06] last:border-r-0">
      <p
        className="font-display text-lg font-bold tabular-nums"
        style={{ color: color ?? 'var(--gs-white)' }}
      >
        {value}
      </p>
      <p className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] mt-0.5">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 bg-[rgba(0,255,136,0.1)] text-[var(--gs-profit)] border border-[rgba(0,255,136,0.2)]">
        Live
      </span>
    );
  }
  return (
    <span className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 bg-white/[0.04] text-[var(--gs-gray-3)] border border-white/[0.06]">
      Empty
    </span>
  );
}

// =============================================================================
// Loading skeleton
// =============================================================================

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-3 w-32 bg-white/[0.04] animate-pulse" />
      <div className="h-10 w-full bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-28 bg-white/[0.04] animate-pulse" />
        <div className="h-28 bg-white/[0.04] animate-pulse" />
        <div className="h-28 bg-white/[0.04] animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Handle Setup (no handle claimed yet)
// =============================================================================

function HandleSetup({
  handleMode,
  setHandleMode,
  slugInput,
  setSlugInput,
  slugValidation,
  isClaimingHandle,
  claimHandle,
  walletAddress,
  error,
}: {
  handleMode: 'auto' | 'custom';
  setHandleMode: (m: 'auto' | 'custom') => void;
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugValidation: SlugValidation;
  isClaimingHandle: boolean;
  claimHandle: () => Promise<void>;
  walletAddress: string;
  error: string | null;
}) {
  const autoSlug = walletAddress.slice(0, 6).toLowerCase();

  const borderColor =
    handleMode === 'custom'
      ? slugValidation.status === 'available' ? 'rgba(166,247,0,0.4)' :
        slugValidation.status === 'taken' || slugValidation.status === 'reserved' ? 'rgba(255,68,68,0.4)' :
        'rgba(255,255,255,0.06)'
      : 'rgba(255,255,255,0.06)';

  const canClaim = handleMode === 'auto' || slugValidation.status === 'available';

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setHandleMode('auto')}
          className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors cursor-pointer ${
            handleMode === 'auto'
              ? 'border-[var(--gs-lime)] text-[var(--gs-lime)] bg-[rgba(166,247,0,0.06)]'
              : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.15]'
          }`}
          style={{ clipPath: clipHex(4) }}
        >
          Auto
        </button>
        <button
          onClick={() => setHandleMode('custom')}
          className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors cursor-pointer ${
            handleMode === 'custom'
              ? 'border-[var(--gs-purple)] text-[var(--gs-purple)] bg-[rgba(109,91,255,0.06)]'
              : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.15]'
          }`}
          style={{ clipPath: clipHex(4) }}
        >
          Custom
        </button>
      </div>

      {/* URL bar */}
      <div
        className="flex items-stretch overflow-hidden transition-colors"
        style={{
          border: `1px solid ${borderColor}`,
          clipPath: clipHex(6),
        }}
      >
        <span className="flex items-center px-3 font-mono text-data text-[var(--gs-gray-3)] bg-white/[0.03] whitespace-nowrap select-none border-r border-white/[0.06]">
          gunzscope.xyz/r/
        </span>
        {handleMode === 'auto' ? (
          <span className="flex items-center flex-1 min-w-0 px-3 py-2.5 font-mono text-data text-[var(--gs-lime)]">
            {autoSlug}
          </span>
        ) : (
          <input
            type="text"
            value={slugInput}
            onChange={e => setSlugInput(e.target.value)}
            placeholder="your-slug"
            maxLength={20}
            className="flex-1 min-w-0 px-3 py-2.5 font-mono text-data text-[var(--gs-white)] bg-transparent outline-none placeholder:text-[var(--gs-gray-4)]"
          />
        )}
      </div>

      {/* Validation (custom mode only) */}
      {handleMode === 'custom' && (
        <div className="min-h-[16px]">
          <ValidationMessage status={slugValidation.status} message={slugValidation.message} />
        </div>
      )}

      {error && (
        <p className="font-mono text-[10px] text-[var(--gs-loss)]">{error}</p>
      )}

      {/* Claim button */}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={!canClaim}
        loading={isClaimingHandle}
        onClick={claimHandle}
      >
        {handleMode === 'auto' ? 'Create Handle' : 'Claim Handle'}
      </Button>
    </div>
  );
}

// =============================================================================
// Handle Display (claimed)
// =============================================================================

function HandleDisplay({
  slug,
  slugType,
  customSlug,
  onSwitchMode,
  onCopy,
  copied,
}: {
  slug: string;
  slugType: 'auto' | 'custom';
  customSlug: string | null;
  onSwitchMode: () => Promise<void>;
  onCopy: () => void;
  copied: boolean;
}) {
  const canSwitch = slugType === 'auto' ? !!customSlug : true;

  return (
    <div className="space-y-3">
      {/* Mode badge + switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 bg-[rgba(166,247,0,0.08)] text-[var(--gs-lime)] border border-[rgba(166,247,0,0.2)]">
            {slugType}
          </span>
          {canSwitch && (
            <button
              onClick={onSwitchMode}
              className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
            >
              Switch to {slugType === 'auto' ? 'custom' : 'auto'}
            </button>
          )}
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 font-mono text-data truncate">
          <span className="text-[var(--gs-gray-3)]">gunzscope.xyz/r/</span>
          <span className="text-[var(--gs-lime)]">{slug}</span>
        </p>
        <button
          onClick={onCopy}
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer ${
            copied
              ? 'border-[rgba(0,255,136,0.3)] text-[var(--gs-profit)]'
              : 'border-white/[0.1] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.2]'
          }`}
          style={{ clipPath: clipHex(4) }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Share Slot Card
// =============================================================================

function SlotCard({
  slot,
  onGenerate,
  onCopy,
  isGenerating,
  isCopied,
  disabled,
}: {
  slot: ShareSlot;
  onGenerate: () => void;
  onCopy: () => void;
  isGenerating: boolean;
  isCopied: boolean;
  disabled: boolean;
}) {
  const meta = METHOD_META[slot.method];

  return (
    <div
      className={`relative border overflow-hidden transition-all ${
        disabled
          ? 'border-white/[0.04] opacity-35 pointer-events-none'
          : 'border-white/[0.06] hover:border-white/[0.12]'
      }`}
      style={{ clipPath: clipHex(6) }}
    >
      {/* Top accent */}
      {slot.active && <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] to-transparent" />}

      <div className="p-4 space-y-3">
        {/* Header row: icon + label + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={slot.active ? 'text-[var(--gs-white)]' : 'text-[var(--gs-gray-3)]'}>
              {meta.icon}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[var(--gs-white)]">
              {meta.label}
            </span>
          </div>
          <StatusBadge active={slot.active} />
        </div>

        {/* Description */}
        <p className="font-mono text-[10px] text-[var(--gs-gray-3)]">
          {meta.description}
        </p>

        {/* Stats row (if active) */}
        {slot.active && (
          <div className="flex items-center gap-4">
            <span className="font-mono text-data tabular-nums text-[var(--gs-gray-4)]">
              {slot.viewCount} {slot.viewCount === 1 ? 'view' : 'views'}
            </span>
            {slot.createdAt && (
              <span className="font-mono text-caption text-[var(--gs-gray-2)]">
                {timeAgo(slot.createdAt)}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {slot.active ? (
            <>
              <button
                onClick={onCopy}
                className={`flex-1 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors cursor-pointer ${
                  isCopied
                    ? 'border-[rgba(0,255,136,0.3)] text-[var(--gs-profit)]'
                    : 'border-white/[0.1] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.2]'
                }`}
                style={{ clipPath: clipHex(4) }}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/[0.08] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.15] transition-colors cursor-pointer disabled:opacity-50"
                style={{ clipPath: clipHex(4) }}
              >
                {isGenerating ? 'Regenerating\u2026' : 'Regenerate'}
              </button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={isGenerating}
              onClick={onGenerate}
            >
              Generate Link
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Recent Referrals
// =============================================================================

function RecentReferralsList({ referrals }: { referrals: RecentReferral[] }) {
  if (referrals.length === 0) return null;

  return (
    <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
      <p className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] mb-2">
        Recent Referrals
      </p>
      {referrals.map((r, i) => {
        const badge = BADGE_STYLES[r.status] ?? BADGE_STYLES.wallet_connected;
        return (
          <div key={i} className="flex items-center justify-between py-1">
            <span className="font-mono text-data text-[var(--gs-white-dim)]">{r.walletPrefix}</span>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5"
                style={{
                  backgroundColor: badge.bg,
                  color: badge.text,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
              <span className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums w-14 text-right">
                {timeAgo(r.convertedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface ShareReferralSectionProps {
  walletAddress: string | undefined;
}

export default function ShareReferralSection({ walletAddress }: ShareReferralSectionProps) {
  const {
    handle,
    isHandleClaimed,
    handleMode,
    setHandleMode,
    slugInput,
    setSlugInput,
    slugValidation,
    claimHandle,
    switchMode,
    isClaimingHandle,
    slots,
    generateLink,
    isGenerating,
    stats,
    recentReferrals,
    copyLink,
    copiedMethod,
    isLoading,
    error,
    retry,
  } = useShareReferral(walletAddress);

  // Copy handle URL
  const handleCopyReferralUrl = async () => {
    if (!handle) return;
    try {
      await navigator.clipboard.writeText(handle.shareUrl);
    } catch { /* silent */ }
  };

  return (
    <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
      <div className="h-[2px] gradient-accent-line" />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
            Share & Referral
          </p>
          {!isLoading && (
            <span
              className={`font-mono text-micro tracking-widest uppercase px-2 py-1 border ${
                isHandleClaimed
                  ? 'border-[rgba(0,255,136,0.3)] text-[var(--gs-profit)] bg-[rgba(0,255,136,0.05)]'
                  : 'border-[var(--gs-warning)]/40 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5'
              }`}
              style={{ clipPath: clipHex(3) }}
            >
              {isHandleClaimed ? 'Active' : 'Setup Required'}
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && <Skeleton />}

        {/* Error (no data) */}
        {!isLoading && error && !isHandleClaimed && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-data text-[var(--gs-loss)]">{error}</p>
            <Button variant="ghost" size="sm" onClick={retry}>Retry</Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && walletAddress && (
          <>
            {/* Handle section */}
            {isHandleClaimed && handle ? (
              <HandleDisplay
                slug={handle.slug}
                slugType={handle.slugType}
                customSlug={handle.customSlug}
                onSwitchMode={switchMode}
                onCopy={handleCopyReferralUrl}
                copied={false}
              />
            ) : (
              !error && (
                <HandleSetup
                  handleMode={handleMode}
                  setHandleMode={setHandleMode}
                  slugInput={slugInput}
                  setSlugInput={setSlugInput}
                  slugValidation={slugValidation}
                  isClaimingHandle={isClaimingHandle}
                  claimHandle={claimHandle}
                  walletAddress={walletAddress}
                  error={error}
                />
              )
            )}

            {/* Share Slots (3 cards) */}
            <div>
              <p className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] mb-3">
                Share Links
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {slots.map(slot => (
                  <SlotCard
                    key={slot.method}
                    slot={slot}
                    onGenerate={() => generateLink(slot.method)}
                    onCopy={() => copyLink(slot.method)}
                    isGenerating={!!isGenerating[slot.method]}
                    isCopied={copiedMethod === slot.method}
                    disabled={!isHandleClaimed}
                  />
                ))}
              </div>
            </div>

            {/* Aggregate Stats */}
            {isHandleClaimed && (
              <div
                className="grid grid-cols-2 sm:grid-cols-4 border border-white/[0.06] overflow-hidden"
                style={{ clipPath: clipHex(6) }}
              >
                <StatCell value={stats.activeLinks} label="Active Links" />
                <StatCell value={stats.totalViews} label="Total Views" color="var(--gs-purple)" />
                <StatCell value={stats.totalConnected} label="Connected" color="var(--gs-purple)" />
                <StatCell
                  value={`${stats.cvrRate}%`}
                  label="CVR Rate"
                  color={stats.cvrRate >= 5 ? 'var(--gs-profit)' : undefined}
                />
              </div>
            )}

            {/* Recent Referrals */}
            {isHandleClaimed && <RecentReferralsList referrals={recentReferrals} />}
          </>
        )}
      </div>
    </section>
  );
}
