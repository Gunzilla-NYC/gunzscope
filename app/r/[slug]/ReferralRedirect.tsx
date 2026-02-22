'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ReferralRedirectProps {
  slug: string | null;
}

export default function ReferralRedirect({ slug }: ReferralRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (slug) {
      // Store referral data for tracking in portfolio flow
      localStorage.setItem('gs_ref', slug);
      const sessionId = crypto.randomUUID();
      localStorage.setItem('gs_ref_session', sessionId);

      // Backup cookie (7d expiry) in case localStorage is cleared
      document.cookie = `gs_ref=${slug}; max-age=${7 * 24 * 60 * 60}; path=/; SameSite=Lax`;

      // Fire click tracking (fire-and-forget)
      fetch('/api/referral/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, event: 'clicked', sessionId }),
      }).catch(() => {});
    }

    router.replace('/');
  }, [slug, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
      <div className="text-center">
        <p className="font-display text-[var(--gs-lime)] text-xl uppercase tracking-wider mb-2">
          GUNZscope
        </p>
        <p className="font-mono text-[var(--gs-gray-3)] text-sm">
          Redirecting&hellip;
        </p>
      </div>
    </div>
  );
}
