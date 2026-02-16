'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShareRedirectProps {
  destinationUrl: string;
}

export default function ShareRedirect({ destinationUrl }: ShareRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(destinationUrl);
  }, [destinationUrl, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
      <div className="text-center">
        <p className="font-display text-[var(--gs-lime)] text-xl uppercase tracking-wider mb-2">
          GUNZscope
        </p>
        <p className="font-mono text-[var(--gs-gray-3)] text-sm">
          Loading portfolio&hellip;
        </p>
      </div>
    </div>
  );
}
