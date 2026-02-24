'use client';

import { useState, useCallback } from 'react';
import { useShareReferral, timeAgo } from '@/lib/hooks/useShareReferral';
import type { ShareSlot, SlugValidation, RecentReferral } from '@/lib/hooks/useShareReferral';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
    label: 'Link',
    description: 'Direct URL',
  },
  discord: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
    label: 'Discord',
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

// Platform accent colors — used for icon tint and top bar
const METHOD_ACCENT: Record<string, string> = {
  link:    '#A6F700',   // lime
  discord: '#5865F2',  // discord blue
  x:       '#E7E9EA',  // near-white
};

// =============================================================================
// Shared primitives
// =============================================================================

function SectionLabel({ label, aside }: { label: string; aside?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-gray-3)]">
        {label}
      </span>
      {aside && (
        <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">{aside}</span>
      )}
    </div>
  );
}

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
    return <span className="font-mono text-[10px] text-[var(--gs-lime)]">&#10003; Available</span>;
  }
  if (status === 'taken' || status === 'reserved') {
    return <span className="font-mono text-[10px] text-[var(--gs-loss)]">&#10007; {message ?? 'Unavailable'}</span>;
  }
  return (
    <span className="font-mono text-[10px] text-[var(--gs-gray-3)]">
      {message ?? '3\u201320 chars, lowercase + hyphens'}
    </span>
  );
}

function StatCell({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="px-4 py-3 border-r border-white/[0.06] last:border-r-0">
      <p className="font-display text-lg font-bold tabular-nums" style={{ color: color ?? 'var(--gs-white)' }}>
        {value}
      </p>
      <p className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] mt-0.5">
        {label}
      </p>
    </div>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-3 w-32 bg-white/[0.04] animate-pulse" />
      <div className="h-10 w-full bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Handle Setup — no handle claimed yet
// =============================================================================

function HandleSetup({
  walletAddress,
  isClaimingHandle,
  claimHandle,
  error,
}: {
  walletAddress: string;
  isClaimingHandle: boolean;
  claimHandle: () => Promise<void>;
  error: string | null;
}) {
  const autoSlug = walletAddress.slice(0, 6).toLowerCase();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-4">
      <p className="font-mono text-[11px] text-[var(--gs-gray-3)] leading-relaxed">
        Create your referral handle to start earning credit for shares. You can customize it once after claiming.
      </p>

      {/* Preview URL */}
      <div
        className="flex items-stretch overflow-hidden border border-white/[0.06]"
        style={{ clipPath: clipHex(6) }}
      >
        <span className="flex items-center px-3 font-mono text-[11px] text-[var(--gs-gray-3)] bg-white/[0.03] whitespace-nowrap select-none border-r border-white/[0.06]">
          gunzscope.xyz/r/
        </span>
        <span className="flex items-center flex-1 px-3 py-2.5 font-mono text-[11px] text-[var(--gs-lime)]">
          {autoSlug}
        </span>
      </div>

      {error && <p className="font-mono text-[10px] text-[var(--gs-loss)]">{error}</p>}

      <Button
        variant="primary"
        size="md"
        className="w-full"
        loading={isClaimingHandle}
        onClick={() => setShowConfirm(true)}
      >
        Claim Handle
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Claim Handle"
        message={`Your share link will be gunzscope.xyz/r/${autoSlug}. You can customize this once after claiming.`}
        confirmLabel="Claim"
        onConfirm={() => { setShowConfirm(false); claimHandle(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

// =============================================================================
// Handle Display — claimed state
// =============================================================================

function HandleDisplay({
  slug,
  canCustomize,
  onCopy,
  copied,
  slugInput,
  setSlugInput,
  slugValidation,
  isClaimingHandle,
  onCustomize,
}: {
  slug: string;
  canCustomize: boolean;
  onCopy: () => void;
  copied: boolean;
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugValidation: SlugValidation;
  isClaimingHandle: boolean;
  onCustomize: () => Promise<void>;
}) {
  const [showCustomizeForm, setShowCustomizeForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-2.5">
      {/* URL bar */}
      <div
        className="flex items-stretch overflow-hidden border border-white/[0.06]"
        style={{ clipPath: clipHex(5) }}
      >
        <span className="flex items-center px-3 font-mono text-[11px] text-[var(--gs-gray-3)] bg-white/[0.03] whitespace-nowrap select-none border-r border-white/[0.06]">
          gunzscope.xyz/r/
        </span>
        <span className="flex items-center flex-1 px-3 py-2 font-mono text-[11px] text-[var(--gs-lime)] truncate">
          {slug}
        </span>
        {/* Claimed indicator */}
        <span className="flex items-center gap-1 px-2.5 font-mono text-[9px] text-[var(--gs-profit)] whitespace-nowrap border-l border-white/[0.06]">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Claimed
        </span>
        {/* Copy — lower visual weight than platform card copies */}
        <button
          onClick={onCopy}
          className={`shrink-0 font-mono text-[9px] uppercase tracking-wider px-3 py-2 border-l border-white/[0.06] transition-colors cursor-pointer ${
            copied
              ? 'text-[var(--gs-profit)]'
              : 'text-[var(--gs-gray-2)] hover:text-[var(--gs-gray-4)]'
          }`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Customize row */}
      {canCustomize && !showCustomizeForm && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">
            One customization remaining
          </span>
          <button
            onClick={() => setShowCustomizeForm(true)}
            className="font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 border border-white/[0.08] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.15] transition-colors cursor-pointer"
            style={{ clipPath: clipHex(3) }}
          >
            Customize
          </button>
        </div>
      )}

      {/* Inline customize form */}
      {canCustomize && showCustomizeForm && (
        <div
          className="space-y-3 p-3 border border-[var(--gs-purple)]/20 bg-[rgba(109,91,255,0.03)]"
          style={{ clipPath: clipHex(5) }}
        >
          <div
            className="flex items-stretch overflow-hidden"
            style={{
              border: `1px solid ${
                slugValidation.status === 'available' ? 'rgba(166,247,0,0.4)' :
                slugValidation.status === 'taken' || slugValidation.status === 'reserved' ? 'rgba(255,68,68,0.4)' :
                'rgba(255,255,255,0.06)'
              }`,
              clipPath: clipHex(5),
            }}
          >
            <span className="flex items-center px-3 font-mono text-[11px] text-[var(--gs-gray-3)] bg-white/[0.03] whitespace-nowrap select-none border-r border-white/[0.06]">
              gunzscope.xyz/r/
            </span>
            <input
              type="text"
              value={slugInput}
              onChange={e => setSlugInput(e.target.value)}
              placeholder="your-slug"
              maxLength={20}
              className="flex-1 min-w-0 px-3 py-2.5 font-mono text-[11px] text-[var(--gs-white)] bg-transparent outline-none placeholder:text-[var(--gs-gray-4)]"
            />
          </div>
          <div className="min-h-[16px]">
            <ValidationMessage status={slugValidation.status} message={slugValidation.message} />
          </div>
          <p className="font-mono text-[9px] text-[var(--gs-gray-2)]">
            This is permanent. Your old link will redirect for 30 days.
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              disabled={slugValidation.status !== 'available'}
              loading={isClaimingHandle}
              onClick={() => setShowConfirm(true)}
            >
              Confirm
            </Button>
            <button
              onClick={() => setShowCustomizeForm(false)}
              className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/[0.08] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
              style={{ clipPath: clipHex(4) }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Locked state */}
      {!canCustomize && (
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-[var(--gs-gray-2)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">Handle locked</span>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="Customize Handle"
        message={`Replace your handle with '${slugInput}'? This cannot be undone. Your old link will redirect for 30 days.`}
        confirmLabel="Claim"
        variant="danger"
        onConfirm={() => { setShowConfirm(false); onCustomize(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

// =============================================================================
// Share Slot Card
// =============================================================================

const ICON_CLIP = 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))';

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
  const accent = METHOD_ACCENT[slot.method] ?? '#A6F700';
  const isActive = slot.active;

  return (
    <div
      className={`relative border overflow-hidden transition-all ${
        disabled
          ? 'border-white/[0.04]'
          : isActive
            ? 'border-white/[0.1] hover:border-white/[0.16]'
            : 'border-white/[0.06] hover:border-white/[0.1]'
      }`}
      style={{ clipPath: clipHex(6) }}
    >
      {/* Top accent — always present, dimmed when inactive so card structure is consistent */}
      <div
        className="h-[2px] w-full transition-opacity"
        style={{
          backgroundColor: accent,
          opacity: isActive ? 1 : disabled ? 0.08 : 0.2,
        }}
      />

      <div className={`p-4 space-y-3 ${disabled ? 'opacity-40' : ''}`}>
        {/* Header: icon + label + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="flex items-center justify-center w-[28px] h-[28px] shrink-0 transition-colors"
              style={{
                clipPath: ICON_CLIP,
                border: `1px solid ${isActive ? `color-mix(in srgb, ${accent} 30%, transparent)` : 'rgba(255,255,255,0.08)'}`,
                backgroundColor: isActive ? `color-mix(in srgb, ${accent} 8%, transparent)` : 'transparent',
                color: isActive ? accent : 'var(--gs-gray-3)',
              }}
            >
              {meta.icon}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[var(--gs-white)]">
              {meta.label}
            </span>
          </div>

          {/* Status badge */}
          {isActive ? (
            <span className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 bg-[rgba(0,255,136,0.08)] text-[var(--gs-profit)] border border-[rgba(0,255,136,0.18)]">
              Live
            </span>
          ) : (
            <span className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 bg-transparent text-[var(--gs-gray-2)] border border-white/[0.06]">
              {disabled ? 'Locked' : 'Empty'}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="font-mono text-[10px] text-[var(--gs-gray-3)]">
          {meta.description}
        </p>

        {/* Stats — only when active */}
        {isActive && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tabular-nums text-[var(--gs-white-dim)]">
              {slot.viewCount} {slot.viewCount === 1 ? 'view' : 'views'}
            </span>
            {slot.createdAt && (
              <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">
                {timeAgo(slot.createdAt)}
              </span>
            )}
          </div>
        )}

        {/* Action */}
        {isActive ? (
          <button
            onClick={onCopy}
            disabled={disabled}
            className={`w-full font-mono text-[10px] uppercase tracking-wider px-3 py-2 border transition-colors cursor-pointer ${
              isCopied
                ? 'border-[rgba(0,255,136,0.3)] text-[var(--gs-profit)] bg-[rgba(0,255,136,0.04)]'
                : 'border-white/[0.12] text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:border-white/[0.2]'
            }`}
            style={{ clipPath: clipHex(4) }}
          >
            {isCopied ? 'Copied!' : 'Copy Link'}
          </button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            loading={isGenerating}
            disabled={disabled}
            onClick={onGenerate}
          >
            Generate
          </Button>
        )}
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
    <div className="border-t border-white/[0.06] pt-4 space-y-1.5">
      <SectionLabel label="Recent Referrals" />
      {referrals.map((r, i) => {
        const badge = BADGE_STYLES[r.status] ?? BADGE_STYLES.wallet_connected;
        return (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="font-mono text-[11px] text-[var(--gs-white-dim)]">{r.walletPrefix}</span>
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
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)] tabular-nums w-14 text-right">
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
    slugInput,
    setSlugInput,
    slugValidation,
    claimHandle,
    customizeHandle,
    isClaimingHandle,
    canCustomize,
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

  const [copiedHandleUrl, setCopiedHandleUrl] = useState(false);
  const handleCopyReferralUrl = useCallback(async () => {
    if (!handle) return;
    try {
      await navigator.clipboard.writeText(handle.shareUrl);
      setCopiedHandleUrl(true);
      setTimeout(() => setCopiedHandleUrl(false), 2000);
    } catch { /* silent */ }
  }, [handle]);

  return (
    <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
      <div className="h-[2px] gradient-accent-line" />
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
            Share &amp; Referral
          </p>
          {!isLoading && (
            <span
              className={`font-mono text-[9px] tracking-widest uppercase px-2 py-1 border ${
                isHandleClaimed
                  ? 'border-[rgba(0,255,136,0.25)] text-[var(--gs-profit)] bg-[rgba(0,255,136,0.05)]'
                  : 'border-[var(--gs-warning)]/30 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5'
              }`}
              style={{ clipPath: clipHex(3) }}
            >
              {isHandleClaimed ? 'Active' : 'Setup Required'}
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && <Skeleton />}

        {/* Error */}
        {!isLoading && error && !isHandleClaimed && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-[var(--gs-loss)]">{error}</p>
            <Button variant="ghost" size="sm" onClick={retry}>Retry</Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && walletAddress && (
          <>
            {/* Handle */}
            <div>
              <SectionLabel
                label="Your Handle"
                aside={isHandleClaimed && canCustomize ? 'Customizable once' : undefined}
              />
              {isHandleClaimed && handle ? (
                <HandleDisplay
                  slug={handle.slug}
                  canCustomize={canCustomize}
                  onCopy={handleCopyReferralUrl}
                  copied={copiedHandleUrl}
                  slugInput={slugInput}
                  setSlugInput={setSlugInput}
                  slugValidation={slugValidation}
                  isClaimingHandle={isClaimingHandle}
                  onCustomize={customizeHandle}
                />
              ) : (
                !error && (
                  <HandleSetup
                    walletAddress={walletAddress}
                    isClaimingHandle={isClaimingHandle}
                    claimHandle={claimHandle}
                    error={error}
                  />
                )
              )}
            </div>

            {/* Share Slots */}
            <div>
              <SectionLabel
                label="Share Links"
                aside={isHandleClaimed ? 'Max 1 per platform' : undefined}
              />
              {!isHandleClaimed && (
                <p className="font-mono text-[10px] text-[var(--gs-gray-2)] mb-3">
                  Claim your handle above to activate share links.
                </p>
              )}
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

            {/* Totals — visually connected to cards via shared border treatment */}
            {isHandleClaimed && (
              <div>
                <SectionLabel label="Totals" />
                <div
                  className="grid grid-cols-2 sm:grid-cols-4 border border-white/[0.06] overflow-hidden"
                  style={{ clipPath: clipHex(6) }}
                >
                  <StatCell value={stats.activeLinks} label="Active Links" color="var(--gs-lime)" />
                  <StatCell value={stats.totalViews} label="Total Views" color="var(--gs-purple-bright)" />
                  <StatCell value={stats.totalConnected} label="Connected" />
                  <StatCell
                    value={`${stats.cvrRate}%`}
                    label="CVR Rate"
                    color={stats.cvrRate >= 5 ? 'var(--gs-profit)' : 'var(--gs-gray-2)'}
                  />
                </div>
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
