import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GUNZscope Overlay',
  robots: 'noindex, nofollow',
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'transparent',
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
