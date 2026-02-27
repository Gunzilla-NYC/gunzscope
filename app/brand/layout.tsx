import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brand Guidelines',
  robots: { index: false, follow: false },
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return children;
}
