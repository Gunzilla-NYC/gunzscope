import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insanity',
  description: 'The Off The Grid experience, reimagined. A visual playground for the GUNZILLA community.',
};

export default function InsanityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
