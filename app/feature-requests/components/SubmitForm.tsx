'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import type { FeatureRequest } from '@/lib/hooks/useFeatureRequests';
import { tokenize, similarity, STATUS_STYLES } from '../utils';

const MAX_SCREENSHOT_SIZE = 2 * 1024 * 1024; // 2MB

export function SubmitForm({
  onSubmit,
  isSubmitting,
  existingRequests,
  onVote,
  canVote,
}: {
  onSubmit: (title: string, description: string, type?: 'feature' | 'bug', screenshotUrl?: string | null) => Promise<boolean>;
  isSubmitting: boolean;
  existingRequests: FeatureRequest[];
  onVote: (id: string, value: 1 | -1) => void;
  canVote: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'feature' | 'bug'>('feature');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleScreenshot = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScreenshotError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScreenshotError('File must be an image');
      return;
    }
    if (file.size > MAX_SCREENSHOT_SIZE) {
      setScreenshotError('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeScreenshot = useCallback(() => {
    setScreenshotPreview(null);
    setScreenshotError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const success = await onSubmit(title, description, type, screenshotPreview);
    if (success) {
      setTitle('');
      setDescription('');
      setType('feature');
      setScreenshotPreview(null);
      setScreenshotError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            Submit a request or report a bug
          </span>
        </div>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--gs-dark-2)] border border-[var(--gs-lime)]/20 clip-corner-sm">
      <div className="h-px bg-gradient-to-r from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent" />
      <div className="p-4 space-y-3">
        {/* Type toggle */}
        <div>
          <label className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1.5">
            Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('feature')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                type === 'feature'
                  ? 'bg-[var(--gs-lime)]/15 border border-[var(--gs-lime)]/40 text-[var(--gs-lime)]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/10'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              Feature
            </button>
            <button
              type="button"
              onClick={() => setType('bug')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                type === 'bug'
                  ? 'bg-[var(--gs-loss)]/15 border border-[var(--gs-loss)]/40 text-[var(--gs-loss)]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/10'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152-6.135 3.254 3.254 0 00-2.58-3.168 22.108 22.108 0 00-8.95 0 3.254 3.254 0 00-2.58 3.168 23.91 23.91 0 01-1.152 6.135A23.863 23.863 0 0112 12.75zm0-9a.75.75 0 100-1.5.75.75 0 000 1.5z" />
              </svg>
              Bug
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder={type === 'bug' ? 'What went wrong?' : 'Short, descriptive title'}
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

        {/* Description */}
        <div>
          <label className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={type === 'bug'
              ? 'What happened? What did you expect instead?'
              : 'What would this feature do? Why is it useful?'
            }
            className="w-full bg-[var(--gs-dark-1)] border border-white/[0.06] px-3 py-2 font-body text-sm text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors resize-none"
          />
          <span className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5 block text-right">
            {description.length}/500
          </span>
        </div>

        {/* Screenshot upload */}
        <div>
          <label className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1.5">
            Screenshot <span className="normal-case tracking-normal text-[var(--gs-gray-2)]">(optional)</span>
          </label>

          {screenshotPreview ? (
            <div className="relative group">
              <img
                src={screenshotPreview}
                alt="Screenshot preview"
                className="w-full max-h-40 object-contain bg-black/30 border border-white/[0.06]"
              />
              <button
                type="button"
                onClick={removeScreenshot}
                className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-[var(--gs-gray-4)] hover:text-[var(--gs-loss)] transition-colors cursor-pointer"
                aria-label="Remove screenshot"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/[0.08] text-[var(--gs-gray-3)] hover:border-white/15 hover:text-[var(--gs-gray-4)] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
              </svg>
              <span className="font-mono text-xs">Attach screenshot</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshot}
            className="hidden"
          />

          {screenshotError && (
            <p className="font-mono text-caption text-[var(--gs-loss)] mt-1">{screenshotError}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="font-display font-semibold text-xs tracking-wider uppercase px-5 py-2 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] disabled:opacity-40 disabled:cursor-not-allowed transition-all clip-corner cursor-pointer"
          >
            {isSubmitting ? 'Submitting\u2026' : type === 'bug' ? 'Report Bug' : 'Submit'}
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
