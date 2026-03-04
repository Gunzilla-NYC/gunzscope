'use client';

import { useReferral, timeAgo } from '@/lib/hooks/useReferral';
import Button from '@/components/ui/Button';
import { clipHex } from '@/lib/utils/styles';

// =============================================================================
// Status badge colors
// =============================================================================

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
        <span className="animate-spin inline-block w-2.5 h-2.5"><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
          <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg></span>
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

  // invalid
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

// =============================================================================
// Loading skeleton
// =============================================================================

function ReferralSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-28 bg-white/[0.04] animate-pulse" />
      <div className="h-5 w-48 bg-white/[0.04] animate-pulse" />
      <div className="h-10 w-full bg-white/[0.04] animate-pulse" />
    </div>
  );
}

// =============================================================================
// Registration form (State 1)
// =============================================================================

function RegistrationForm({
  slugInput,
  setSlugInput,
  slugValidation,
  isRegistering,
  register,
  error,
}: {
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugValidation: { status: string; message?: string };
  isRegistering: boolean;
  register: () => Promise<void>;
  error: string | null;
}) {
  const borderColor =
    slugValidation.status === 'available' ? 'rgba(166,247,0,0.4)' :
    slugValidation.status === 'taken' || slugValidation.status === 'reserved' ? 'rgba(255,68,68,0.4)' :
    'rgba(255,255,255,0.06)';

  return (
    <div className="space-y-3">
      {/* Description */}
      <p className="font-mono text-data text-[var(--gs-gray-3)] leading-relaxed">
        Claim your custom referral link and track who joins through you.
      </p>

      {/* Input group */}
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
        <input
          type="text"
          value={slugInput}
          onChange={e => setSlugInput(e.target.value)}
          placeholder="your-slug"
          maxLength={20}
          className="flex-1 min-w-0 px-3 py-2.5 font-mono text-data text-[var(--gs-white)] bg-transparent outline-none placeholder:text-[var(--gs-gray-4)]"
        />
      </div>

      {/* Validation */}
      <div className="min-h-[16px]">
        <ValidationMessage status={slugValidation.status} message={slugValidation.message} />
      </div>

      {/* Error */}
      {error && (
        <p className="font-mono text-[10px] text-[var(--gs-loss)]">{error}</p>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={slugValidation.status !== 'available'}
        loading={isRegistering}
        onClick={register}
      >
        Claim My Link
      </Button>
    </div>
  );
}

// =============================================================================
// Stats dashboard (State 2)
// =============================================================================

function StatsDashboard({
  stats,
  copied,
  copyShareUrl,
  shareOnX,
}: {
  stats: {
    slug: string;
    totalClicks: number;
    totalWalletsConnected: number;
    totalConversions: number;
    conversionRate: number;
    recentReferrals: Array<{ walletPrefix: string; status: string; convertedAt: string }>;
  };
  copied: boolean;
  copyShareUrl: () => Promise<void>;
  shareOnX: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* URL row */}
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 font-mono text-data truncate">
          <span className="text-[var(--gs-gray-3)]">gunzscope.xyz/r/</span>
          <span className="text-[var(--gs-lime)]">{stats.slug}</span>
        </p>
        <button
          onClick={copyShareUrl}
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer ${
            copied
              ? 'border-[rgba(0,255,136,0.3)] text-[var(--gs-profit)]'
              : 'border-white/[0.1] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.2]'
          }`}
          style={{ clipPath: clipHex(4) }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <Button variant="ghost" size="sm" onClick={shareOnX} className="gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share
        </Button>
      </div>

      {/* Stats grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 border border-white/[0.06] overflow-hidden"
        style={{ clipPath: clipHex(6) }}
      >
        <StatCell value={stats.totalClicks} label="Clicks" />
        <StatCell value={stats.totalWalletsConnected} label="Connected" color="var(--gs-purple)" />
        <StatCell value={stats.totalConversions} label="Converted" color="var(--gs-lime)" />
        <StatCell
          value={`${stats.conversionRate}%`}
          label="CVR Rate"
          color={stats.conversionRate >= 5 ? 'var(--gs-profit)' : undefined}
        />
      </div>

      {/* Recent referrals */}
      {stats.recentReferrals.length > 0 && (
        <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
          <p className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] mb-2">
            Recent Referrals
          </p>
          {stats.recentReferrals.map((r, i) => {
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
      )}
    </div>
  );
}

// =============================================================================
// Main component — account page section pattern
// =============================================================================

interface ReferralSectionProps {
  walletAddress: string | undefined;
}

export default function ReferralSection({ walletAddress }: ReferralSectionProps) {
  const {
    isLoading,
    isRegistered,
    stats,
    error,
    slugInput,
    setSlugInput,
    slugValidation,
    isRegistering,
    register,
    copied,
    copyShareUrl,
    shareOnX,
    retry,
  } = useReferral(walletAddress);

  return (
    <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
      <div className="h-[2px] gradient-accent-line" />
      <div className="p-6">
        <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-4">
          Referral Program
        </p>

        {/* Loading */}
        {isLoading && <ReferralSkeleton />}

        {/* Error (no data at all) */}
        {!isLoading && error && !isRegistered && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-data text-[var(--gs-loss)]">{error}</p>
            <Button variant="ghost" size="sm" onClick={retry}>Retry</Button>
          </div>
        )}

        {/* State 2: Registered — stats dashboard */}
        {!isLoading && isRegistered && stats && (
          <StatsDashboard
            stats={stats}
            copied={copied}
            copyShareUrl={copyShareUrl}
            shareOnX={shareOnX}
          />
        )}

        {/* State 1: Not registered — registration form */}
        {!isLoading && !isRegistered && !error && (
          <RegistrationForm
            slugInput={slugInput}
            setSlugInput={setSlugInput}
            slugValidation={slugValidation}
            isRegistering={isRegistering}
            register={register}
            error={error}
          />
        )}
      </div>
    </section>
  );
}
