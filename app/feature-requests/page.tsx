'use client';

import { useState, Suspense } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useFeatureRequests, type FeatureRequest } from '@/lib/hooks/useFeatureRequests';

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-[var(--gs-lime)]/10', text: 'text-[var(--gs-lime)]', label: 'Open' },
  planned: { bg: 'bg-[var(--gs-purple)]/10', text: 'text-[var(--gs-purple)]', label: 'Planned' },
  completed: { bg: 'bg-[var(--gs-profit)]/10', text: 'text-[var(--gs-profit)]', label: 'Done' },
  declined: { bg: 'bg-[var(--gs-loss)]/10', text: 'text-[var(--gs-loss)]', label: 'Declined' },
};

// =============================================================================
// Vote Button
// =============================================================================

function VoteButton({
  direction,
  active,
  disabled,
  onClick,
}: {
  direction: 'up' | 'down';
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isUp = direction === 'up';
  const activeColor = isUp ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-loss)]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`p-1 transition-colors ${
        disabled
          ? 'text-[var(--gs-gray-1)] cursor-not-allowed'
          : active
            ? activeColor
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] cursor-pointer'
      }`}
      aria-label={isUp ? 'Upvote' : 'Downvote'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        {isUp ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        )}
      </svg>
    </button>
  );
}

// =============================================================================
// Request Card
// =============================================================================

function RequestCard({
  request,
  canVote,
  onVote,
}: {
  request: FeatureRequest;
  canVote: boolean;
  onVote: (id: string, value: 1 | -1) => void;
}) {
  const status = STATUS_STYLES[request.status] || STATUS_STYLES.open;
  const scoreColor =
    request.netVotes > 0
      ? 'text-[var(--gs-lime)]'
      : request.netVotes < 0
        ? 'text-[var(--gs-loss)]'
        : 'text-[var(--gs-gray-3)]';

  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-[var(--gs-lime)]/20 via-[var(--gs-purple)]/10 to-transparent" />

      <div className="flex gap-3 p-4">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-0.5 min-w-[36px]">
          <VoteButton
            direction="up"
            active={request.userVote === 1}
            disabled={!canVote}
            onClick={() => onVote(request.id, 1)}
          />
          <span className={`font-mono text-sm font-bold tabular-nums ${scoreColor}`}>
            {request.netVotes}
          </span>
          <VoteButton
            direction="down"
            active={request.userVote === -1}
            disabled={!canVote}
            onClick={() => onVote(request.id, -1)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="font-body text-sm font-semibold text-[var(--gs-white)] leading-snug">
              {request.title}
            </h3>
            <span className={`shrink-0 font-mono text-label uppercase tracking-wider px-1.5 py-0.5 ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="font-body text-xs text-[var(--gs-gray-4)] leading-relaxed mb-2">
            {request.description}
          </p>
          <div className="flex items-center gap-3 text-[var(--gs-gray-2)]">
            <span className="font-mono text-caption">
              {request.authorName || truncateAddress(request.authorId)}
            </span>
            <span className="font-mono text-caption">&middot;</span>
            <span className="font-mono text-caption">{timeAgo(request.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Submit Form
// =============================================================================

function SubmitForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (title: string, description: string) => Promise<boolean>;
  isSubmitting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const success = await onSubmit(title, description);
    if (success) {
      setTitle('');
      setDescription('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 text-left hover:border-[var(--gs-lime)]/20 transition-colors group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center border border-[var(--gs-lime)]/30 text-[var(--gs-lime)] group-hover:bg-[var(--gs-lime)]/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="font-mono text-xs text-[var(--gs-gray-4)] uppercase tracking-wider">
            Submit a feature request
          </span>
        </div>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--gs-dark-2)] border border-[var(--gs-lime)]/20 overflow-hidden">
      <div className="h-px bg-gradient-to-r from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent" />
      <div className="p-4 space-y-3">
        <div>
          <label className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Short, descriptive title"
            className="w-full bg-[var(--gs-dark-1)] border border-white/[0.06] px-3 py-2 font-body text-sm text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors"
            autoFocus
          />
          <span className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5 block text-right">
            {title.length}/100
          </span>
        </div>
        <div>
          <label className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What would this feature do? Why is it useful?"
            className="w-full bg-[var(--gs-dark-1)] border border-white/[0.06] px-3 py-2 font-body text-sm text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors resize-none"
          />
          <span className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5 block text-right">
            {description.length}/500
          </span>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="font-display font-semibold text-xs tracking-wider uppercase px-5 py-2 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] disabled:opacity-40 disabled:cursor-not-allowed transition-all clip-corner cursor-pointer"
          >
            {isSubmitting ? 'Submitting\u2026' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="font-mono text-xs text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// =============================================================================
// Main Page
// =============================================================================

function FeatureRequestsContent() {
  const { user, setShowAuthFlow } = useDynamicContext();
  const isAuthenticated = !!user;
  const {
    requests,
    eligibility,
    isLoading,
    isSubmitting,
    error,
    submitRequest,
    vote,
  } = useFeatureRequests();

  const canParticipate = isAuthenticated && eligibility?.eligible === true;

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide mb-2">
            Feature Requests
          </h1>
          <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
            Suggest features and vote on what gets built next. Requires 5+ OTG NFTs to participate.
          </p>
        </div>

        {/* Eligibility Gate */}
        {!isAuthenticated && (
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5 mb-6">
            <div className="h-px bg-gradient-to-r from-[var(--gs-purple)]/30 to-transparent -mt-5 mb-4 -mx-5" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center border border-[var(--gs-purple)]/30 text-[var(--gs-purple)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-body text-sm text-[var(--gs-white)] font-medium mb-0.5">
                  Connect your wallet to participate
                </p>
                <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                  You need a connected wallet with 5+ OTG NFTs to submit and vote.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthFlow(true)}
                className="font-display font-semibold text-xs tracking-wider uppercase px-4 py-2 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] transition-all clip-corner shrink-0 cursor-pointer"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {isAuthenticated && eligibility && !eligibility.eligible && (
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5 mb-6">
            <div className="h-px bg-gradient-to-r from-[var(--gs-purple)]/30 to-transparent -mt-5 mb-4 -mx-5" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center border border-[var(--gs-purple)]/30 text-[var(--gs-purple)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="font-body text-sm text-[var(--gs-white)] font-medium mb-0.5">
                  You need 5+ OTG NFTs to participate
                </p>
                <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                  You currently have {eligibility.nftCount} NFT{eligibility.nftCount !== 1 ? 's' : ''}. Load your portfolio to update your count.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[var(--gs-loss)]/10 border border-[var(--gs-loss)]/20 px-4 py-3 mb-6">
            <p className="font-mono text-xs text-[var(--gs-loss)]">{error}</p>
          </div>
        )}

        {/* Submit Form (eligible users only) */}
        {canParticipate && (
          <div className="mb-6">
            <SubmitForm onSubmit={submitRequest} isSubmitting={isSubmitting} />
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
            <p className="font-mono text-xs text-[var(--gs-gray-3)]">Loading requests&hellip;</p>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-white/[0.06] text-[var(--gs-gray-2)]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <p className="font-body text-sm text-[var(--gs-gray-4)] mb-1">No feature requests yet</p>
            <p className="font-mono text-caption text-[var(--gs-gray-2)]">
              Be the first to suggest a feature!
            </p>
          </div>
        ) : (
          /* Request List */
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                canVote={canParticipate}
                onVote={vote}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function FeatureRequestsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <FeatureRequestsContent />
    </Suspense>
  );
}
