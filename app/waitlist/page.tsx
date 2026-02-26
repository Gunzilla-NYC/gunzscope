import { Suspense } from 'react';
import type { Metadata } from 'next';
import WaitlistClient from './WaitlistClient';

export const metadata: Metadata = {
  title: 'Waitlist | GUNZscope',
  description: 'You\u2019re on the waitlist. Refer friends to unlock early access to GUNZscope.',
};

export default function WaitlistPage() {
  return (
    <Suspense>
      <WaitlistClient />
    </Suspense>
  );
}
