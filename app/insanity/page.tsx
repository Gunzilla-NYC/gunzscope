'use client';

import { Suspense } from 'react';
import { InsanityContent } from './components/InsanityContent';

export default function InsanityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <InsanityContent />
    </Suspense>
  );
}
