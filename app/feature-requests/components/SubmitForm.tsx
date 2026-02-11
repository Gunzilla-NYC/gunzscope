'use client';

import { useState, useMemo } from 'react';
import type { FeatureRequest } from '@/lib/hooks/useFeatureRequests';
import { tokenize, similarity, STATUS_STYLES } from '../utils';

export function SubmitForm({
  onSubmit,
  isSubmitting,
  existingRequests,
  onVote,
  canVote,
}: {
  onSubmit: (title: string, description: string) => Promise<boolean>;
  isSubmitting: boolean;
  existingRequests: FeatureRequest[];
  onVote: (id: string, value: 1 | -1) => void;
  canVote: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const similarRequests = useMemo(() => {
    const trimmed = title.trim();
    if (trimmed.length < 3) return [];
    const inputTokens = tokenize(trimmed);
    if (inputTokens.size === 0) return [];

    return existingRequests
      .map((r) => {
        const titleTokens = tokenize(r.title);
        const descTokens = tokenize(r.description);
        const titleScore = similarity(inputTokens, titleTokens);
        const descScore = similarity(inputTokens, descTokens) * 0.5;
        return { request: r, score: Math.max(titleScore, descScore) };
      })
      .filter((m) => m.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((m) => m.request);
  }, [title, existingRequests]);

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
        className="w-full bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 text-left hover:border-[var(--gs-lime)]/20 transition-colors group cursor-pointer clip-corner-sm"
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
    <form onSubmit={handleSubmit} className="bg-[var(--gs-dark-2)] border border-[var(--gs-lime)]/20 clip-corner-sm">
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

          {/* Similar requests hint */}
          {similarRequests.length > 0 && (
            <div className="mt-2 border border-[var(--gs-purple)]/20 bg-[var(--gs-dark-1)]">
              <div className="px-3 py-1.5 border-b border-white/[0.04]">
                <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-purple)]">
                  Similar requests already exist
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {similarRequests.map((r) => {
                  const status = STATUS_STYLES[r.status] || STATUS_STYLES.open;
                  return (
                    <div key={r.id} className="px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-[var(--gs-white)] truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`font-mono text-label ${status.text}`}>{status.label}</span>
                          <span className="font-mono text-label text-[var(--gs-gray-2)]">&middot; {r.netVotes} vote{r.netVotes !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {canVote && r.userVote !== 1 && (
                        <button
                          type="button"
                          onClick={() => onVote(r.id, 1)}
                          className="shrink-0 font-mono text-label uppercase tracking-wider text-[var(--gs-lime)] hover:text-[var(--gs-lime)]/80 transition-colors cursor-pointer px-2 py-1 border border-[var(--gs-lime)]/20 hover:border-[var(--gs-lime)]/40"
                        >
                          Upvote
                        </button>
                      )}
                      {canVote && r.userVote === 1 && (
                        <span className="shrink-0 font-mono text-label uppercase tracking-wider text-[var(--gs-gray-3)] px-2 py-1">
                          Voted
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
