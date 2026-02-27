import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture',
  robots: { index: false, follow: false },
};

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
