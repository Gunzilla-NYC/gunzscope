'use client';

import { useState } from 'react';
import type { FeatureRequest } from '@/lib/hooks/useFeatureRequests';
import { timeAgo, STATUS_STYLES, TYPE_STYLES } from '../utils';
import { VoteButton } from './VoteButton';

export function RequestCard({
  request,
  canVote,
  isAdmin,
  onVote,
  onUpdateStatus,
  onDelete,
}: {
  request: FeatureRequest;
  canVote: boolean;
  isAdmin: boolean;
  onVote: (id: string, value: 1 | -1) => void;
  onUpdateStatus: (id: string, status: string, adminNote?: string, showAttribution?: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingAction, setPendingAction] = useState<'completed' | 'declined' | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [includeAttribution, setIncludeAttribution] = useState(true);
  const [lightbox, setLightbox] = useState(false);

  const status = STATUS_STYLES[request.status] || STATUS_STYLES.open;
  const scoreColor =
    request.netVotes > 0
      ? 'text-[var(--gs-lime)]'
      : request.netVotes < 0
        ? 'text-[var(--gs-loss)]'
        : 'text-[var(--gs-gray-3)]';

  // Progressive transparency — unpopular/downvoted or older requests fade out
  const ageDays = (Date.now() - new Date(request.createdAt).getTime()) / 86_400_000;
  const ageFactor = Math.max(0, 1 - ageDays / 90);
  const voteFactor = Math.max(0, Math.min(1, (request.netVotes + 5) / 10));
  const cardOpacity = 0.35 + 0.65 * (voteFactor * 0.6 + ageFactor * 0.4);

  const handleDelete = () => {
    if (window.confirm('Delete this feature request? This cannot be undone.')) {
      onDelete(request.id);
    }
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const attribution = pendingAction === 'completed' ? includeAttribution : undefined;
    onUpdateStatus(request.id, pendingAction, reasonText.trim() || undefined, attribution);
    setPendingAction(null);
    setReasonText('');
    setIncludeAttribution(true);
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setReasonText('');
    setIncludeAttribution(true);
  };

  return (
    <div
      className="bg-[var(--gs-dark-2)] border border-white/[0.06] clip-corner-sm"
      style={{ opacity: cardOpacity }}
    >
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
          {/* Collapsed header — always visible, click to expand */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-left cursor-pointer group/card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className={`w-3 h-3 shrink-0 text-[var(--gs-gray-2)] transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                  viewBox="0 0 6 10"
                  fill="currentColor"
                >
                  <path d="M0 0l6 5-6 5z" />
                </svg>
                <h3 className="font-body text-sm font-semibold text-[var(--gs-white)] leading-snug truncate group-hover/card:text-[var(--gs-gray-4)] transition-colors">
                  {request.title}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {request.type === 'bug' && (
                  <span className={`font-mono text-label uppercase tracking-wider px-1.5 py-0.5 ${TYPE_STYLES.bug.bg} ${TYPE_STYLES.bug.text}`}>
                    {TYPE_STYLES.bug.label}
                  </span>
                )}
                {request.status === 'completed' && request.showAttribution && (
                  <span className="font-mono text-label uppercase tracking-wider px-1.5 py-0.5 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)]">
                    ★
                  </span>
                )}
                <span className={`font-mono text-label uppercase tracking-wider px-1.5 py-0.5 ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>
            </div>
            {/* Collapsed meta line */}
            {!expanded && (
              <div className="flex items-center gap-3 text-[var(--gs-gray-2)] mt-1 ml-5">
                <span className="font-mono text-caption">
                  {request.authorName || 'Anonymous'}
                </span>
                <span className="font-mono text-caption">&middot;</span>
                <span className="font-mono text-caption">{timeAgo(request.createdAt)}</span>
                {request.screenshotUrl && (
                  <>
                    <span className="font-mono text-caption">&middot;</span>
                    <span className="font-mono text-caption text-[var(--gs-gray-2)]">has image</span>
                  </>
                )}
              </div>
            )}
          </button>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-2 ml-5">
              <p className="font-body text-xs text-[var(--gs-gray-4)] leading-relaxed mb-2">
                {request.description}
              </p>
              {/* Screenshot thumbnail */}
              {request.screenshotUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="block mb-2 group/img cursor-pointer"
                  >
                    <img
                      src={request.screenshotUrl}
                      alt="Attached screenshot"
                      className="max-h-32 object-contain bg-black/30 border border-white/[0.06] group-hover/img:border-[var(--gs-lime)]/30 transition-colors"
                      loading="lazy"
                    />
                  </button>
                  {lightbox && (
                    <div
                      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80"
                      onClick={() => setLightbox(false)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setLightbox(false); }}
                      role="dialog"
                      aria-modal="true"
                      tabIndex={-1}
                      ref={(el) => el?.focus()}
                    >
                      <button
                        type="button"
                        onClick={() => setLightbox(false)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] font-mono text-lg transition-colors cursor-pointer"
                        aria-label="Close"
                      >
                        &times;
                      </button>
                      <img
                        src={request.screenshotUrl}
                        alt="Attached screenshot"
                        className="max-w-[90vw] max-h-[85vh] object-contain border border-white/[0.06]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-3 text-[var(--gs-gray-2)]">
                <span className="font-mono text-caption">
                  {request.authorName || 'Anonymous'}
                </span>
                <span className="font-mono text-caption">&middot;</span>
                <span className="font-mono text-caption">{timeAgo(request.createdAt)}</span>
              </div>

              {/* Admin Note */}
              {request.adminNote && (
                <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1.5 italic">
                  &ldquo;{request.adminNote}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Admin Actions — always visible for admins */}
          {isAdmin && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.04]">
              {pendingAction ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="Reason (optional)"
                    maxLength={200}
                    className="w-full bg-[var(--gs-dark-1)] border border-white/[0.06] px-2 py-1 font-mono text-caption text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmAction();
                      if (e.key === 'Escape') handleCancelAction();
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmAction}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-lime)] hover:text-[var(--gs-lime)]/80 transition-colors cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAction}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  {pendingAction === 'completed' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAttribution}
                        onChange={(e) => setIncludeAttribution(e.target.checked)}
                        className="accent-[var(--gs-lime)] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="font-mono text-caption text-[var(--gs-gray-3)]">Include in credits page</span>
                    </label>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {request.status !== 'open' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(request.id, 'open')}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-purple)] hover:text-[var(--gs-purple)]/80 transition-colors cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                  {request.status !== 'planned' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(request.id, 'planned')}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-purple)] hover:text-[var(--gs-purple)]/80 transition-colors cursor-pointer"
                    >
                      In Flight
                    </button>
                  )}
                  {request.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => setPendingAction('completed')}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-profit)] hover:text-[var(--gs-profit)]/80 transition-colors cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                  {request.status !== 'declined' && (
                    <button
                      type="button"
                      onClick={() => setPendingAction('declined')}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-loss)] hover:text-[var(--gs-loss)]/80 transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                  )}
                  {/* Attribution toggle for completed requests */}
                  {request.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(request.id, 'completed', undefined, !request.showAttribution)}
                      className={`font-mono text-caption uppercase tracking-wider transition-colors cursor-pointer ${
                        request.showAttribution
                          ? 'text-[var(--gs-lime)]/70 hover:text-[var(--gs-lime)]'
                          : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
                      }`}
                      title={request.showAttribution ? 'Remove from credits' : 'Add to credits'}
                    >
                      {request.showAttribution ? '★ Credited' : '☆ Credit'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-loss)] transition-colors cursor-pointer ml-auto"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
