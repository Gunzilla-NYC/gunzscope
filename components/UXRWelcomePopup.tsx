'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';

const STORAGE_KEY = 'gs-uxr-welcome-dismissed';

export default function UXRWelcomePopup() {
  const { user } = useDynamicContext();
  const isAuthenticated = !!user;

  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Show popup after login, once per user
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch { /* localStorage unavailable */ }
  }, [isAuthenticated]);

  const dismiss = useCallback(() => {
    setClosing(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setTimeout(() => setVisible(false), 300);
  }, []);

  // ESC key to dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={dismiss}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg mx-4 transition-all duration-300 ${
          closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}
      >
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] via-[var(--gs-purple)] to-transparent" />

        <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] border-t-0 p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 text-[var(--gs-gray-3)] hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center mb-5">
            <div
              className="w-14 h-14 flex items-center justify-center bg-[var(--gs-lime)]/10 border border-[var(--gs-lime)]/20"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              <svg className="w-7 h-7 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--gs-white)] text-center mb-2">
            Welcome to GUNZscope
          </h2>
          <p className="font-mono text-[10px] tracking-widest uppercase text-center text-[var(--gs-purple)] mb-5">
            Early Access // User Research
          </p>

          {/* Body */}
          <div className="space-y-3 text-sm text-[var(--gs-gray-4)] leading-relaxed">
            <p>
              Thanks for checking this out. You&apos;re one of the first people testing GUNZscope, and your feedback genuinely shapes what gets built next.
            </p>
            <p>
              This is under <span className="text-[var(--gs-white)]">daily active development</span> &mdash; some features are experimental, data might be off, and things will break. That&apos;s expected and part of the process.
            </p>
            <p>
              If you spot a bug or have an idea, drop it on the{' '}
              <Link
                href="/feature-requests"
                onClick={dismiss}
                className="text-[var(--gs-lime)] hover:underline underline-offset-2"
              >
                Feedback &amp; Bug Reports
              </Link>
              {' '}page. You can also <span className="text-[var(--gs-white)]">upvote and downvote</span> other people&apos;s ideas to help prioritize what gets built first.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-6 space-y-2.5">
            <Link
              href="/feature-requests"
              onClick={dismiss}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[var(--gs-lime)] text-black font-semibold text-sm hover:brightness-110 transition-all"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Report a Bug or Request a Feature
            </Link>

            <button
              onClick={dismiss}
              className="w-full py-2.5 px-4 text-sm text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/5 transition"
            >
              Got it, let me explore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
