'use client';

import { useState } from 'react';
import type { FeatureRequest } from '@/lib/hooks/useFeatureRequests';
import { truncateAddress, timeAgo, STATUS_STYLES } from '../utils';
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
  onUpdateStatus: (id: string, status: string, adminNote?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [pendingAction, setPendingAction] = useState<'completed' | 'declined' | null>(null);
  const [reasonText, setReasonText] = useState('');

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
    onUpdateStatus(request.id, pendingAction, reasonText.trim() || undefined);
    setPendingAction(null);
    setReasonText('');
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setReasonText('');
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

          {/* Admin Note */}
          {request.adminNote && (
            <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1.5 italic">
              &ldquo;{request.adminNote}&rdquo;
            </p>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.04]">
              {pendingAction ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="Reason (optional)"
                    maxLength={200}
                    className="flex-1 bg-[var(--gs-dark-1)] border border-white/[0.06] px-2 py-1 font-mono text-caption text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmAction();
                      if (e.key === 'Escape') handleCancelAction();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    className="font-mono text-caption uppercase tracking-wider text-[var(--gs-lime)] hover:text-[var(--gs-lime)]/80 transition-colors cursor-pointer shrink-0"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAction}
                    className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {request.status !== 'open' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(request.id, 'open')}
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-purple)] hover:text-[var(--gs-purple)]/80 transition-colors cursor-pointer"
                    >
                      Reopen
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
