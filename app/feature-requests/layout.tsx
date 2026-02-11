import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature Requests | GUNZscope',
  description: 'Vote on and submit feature requests for GUNZscope. Shape the future of the platform.',
};

export default function FeatureRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
